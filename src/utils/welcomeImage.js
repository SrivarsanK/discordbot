const { AttachmentBuilder } = require("discord.js");
const { createCanvas, loadImage } = require("@napi-rs/canvas");

const DEFAULT_WIDTH = 760;
const DEFAULT_HEIGHT = 360;
const MAX_IMAGE_SOURCE_LENGTH = 8 * 1024 * 1024;

const DEFAULT_DYNAMIC_IMAGE_TEMPLATE = createDefaultTemplate("default", "Welcome card");

function normalizeWelcomeDynamicImages(raw = {}) {
  const templates = Array.isArray(raw.templates)
    ? raw.templates.map((template, index) => normalizeTemplate(template, index)).filter(Boolean)
    : [];

  if (!templates.length) templates.push(createDefaultTemplate("default", "Welcome card"));

  const safeTemplates = templates.slice(0, 3);
  const attachedId = stringValue(raw.attachedId, 0, 64);
  const hasAttached = safeTemplates.some((template) => template.id === attachedId);

  return {
    enabled: Boolean(raw.enabled),
    attachedId: hasAttached ? attachedId : safeTemplates[0].id,
    templates: safeTemplates,
  };
}

async function buildWelcomeImageAttachment(member, rawDynamicImages, logger) {
  const dynamicImages = normalizeWelcomeDynamicImages(rawDynamicImages);
  if (!dynamicImages.enabled) return null;

  const template =
    dynamicImages.templates.find((item) => item.id === dynamicImages.attachedId) ||
    dynamicImages.templates[0];
  if (!template) return null;

  try {
    const buffer = await renderWelcomeImage(member, template, logger);
    return new AttachmentBuilder(buffer, {
      name: `welcome-${safeFilePart(template.id)}.png`,
    });
  } catch (error) {
    logger?.log?.(`[WelcomeImage] Failed to render image: ${error.message}`, "warn");
    return null;
  }
}

async function renderWelcomeImage(member, template, logger) {
  const safe = normalizeTemplate(template);
  const canvas = createCanvas(safe.width, safe.height);
  const ctx = canvas.getContext("2d");
  const layers = safe.layers;

  await drawBackground(ctx, safe, logger);

  drawRectLayer(ctx, layers.accentLeft);
  drawRectLayer(ctx, layers.accentRight);
  drawRectLayer(ctx, layers.card);
  drawBadgeLayer(ctx, layers.badge, member);
  await drawAvatarLayer(ctx, layers.avatar, member, logger);
  drawTextLayer(ctx, layers.title, member);
  drawTextLayer(ctx, layers.subtitle, member);
  for (const layer of safe.customLayers) {
    await drawCustomLayer(ctx, layer, member, logger);
  }

  return canvas.toBuffer("image/png");
}

async function drawBackground(ctx, template, logger) {
  const background = template.background;
  ctx.fillStyle = background.color;
  ctx.fillRect(0, 0, template.width, template.height);

  const imageUrl = safeUrl(background.imageUrl);
  if (!imageUrl) return;

  const image = await loadImageSource(imageUrl, logger);
  if (!image) return;

  const opacity = background.opacity / 100;
  const scale = background.scale / 100;
  let drawW = template.width;
  let drawH = template.height;

  if (background.fit === "cover" || background.fit === "contain") {
    const ratio = background.fit === "cover"
      ? Math.max(template.width / image.width, template.height / image.height)
      : Math.min(template.width / image.width, template.height / image.height);
    drawW = image.width * ratio * scale;
    drawH = image.height * ratio * scale;
  } else if (background.fit === "original") {
    drawW = image.width * scale;
    drawH = image.height * scale;
  } else {
    drawW = template.width * scale;
    drawH = template.height * scale;
  }

  const x = (template.width - drawW) / 2 + background.x;
  const y = (template.height - drawH) / 2 + background.y;
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.drawImage(image, x, y, drawW, drawH);
  ctx.restore();
}

function drawRectLayer(ctx, layer) {
  if (!layer?.visible) return;
  ctx.save();
  ctx.globalAlpha = layer.opacity / 100;
  ctx.fillStyle = layer.color;
  roundedRect(ctx, layer.x, layer.y, layer.width, layer.height, layer.radius);
  ctx.fill();
  ctx.restore();
}

function drawBadgeLayer(ctx, layer, member) {
  if (!layer?.visible) return;
  const text = parseImageText(layer.text, member);
  ctx.save();
  ctx.globalAlpha = layer.opacity / 100;
  ctx.fillStyle = layer.color;
  roundedRect(ctx, layer.x, layer.y, layer.width, layer.height, layer.radius);
  ctx.fill();
  ctx.fillStyle = layer.textColor;
  ctx.font = `${layer.fontWeight} ${layer.fontSize}px Arial`;
  ctx.textAlign = layer.align;
  ctx.textBaseline = "middle";
  fitAndDrawText(ctx, text, textX(layer), layer.y + layer.height / 2 + 1, layer.width - 12, layer.fontSize, 10, layer.fontWeight);
  ctx.restore();
}

async function drawAvatarLayer(ctx, layer, member, logger) {
  if (!layer?.visible) return;
  const size = layer.size || Math.min(layer.width, layer.height);
  const radius = Math.min(layer.radius, size / 2);
  const image = await loadAvatarOrCustom(member, layer, logger);

  ctx.save();
  roundedRect(ctx, layer.x, layer.y, size, size, radius);
  ctx.clip();

  if (image) {
    drawImageToBox(ctx, image, layer.x, layer.y, size, size, layer.imageFit);
  } else {
    ctx.fillStyle = "#5865f2";
    ctx.fillRect(layer.x, layer.y, size, size);
    ctx.fillStyle = "#ffffff";
    ctx.font = `900 ${Math.round(size * 0.48)}px Arial`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(initial(member?.displayName || member?.user?.username), layer.x + size / 2, layer.y + size / 2 + 2);
  }

  ctx.restore();

  if (layer.borderWidth > 0) {
    ctx.save();
    ctx.strokeStyle = layer.borderColor;
    ctx.lineWidth = layer.borderWidth;
    roundedRect(
      ctx,
      layer.x - layer.borderWidth / 2,
      layer.y - layer.borderWidth / 2,
      size + layer.borderWidth,
      size + layer.borderWidth,
      radius + layer.borderWidth / 2,
    );
    ctx.stroke();
    ctx.restore();
  }
}

function drawTextLayer(ctx, layer, member) {
  if (!layer?.visible) return;
  const text = parseImageText(layer.text, member);
  if (!text) return;

  ctx.save();
  ctx.globalAlpha = layer.opacity / 100;
  ctx.fillStyle = layer.textColor;
  ctx.font = `${layer.italic ? "italic " : ""}${layer.fontWeight} ${layer.fontSize}px Arial`;
  ctx.textAlign = layer.align;
  ctx.textBaseline = "middle";
  fitAndDrawText(ctx, text, textX(layer), layer.y + layer.height / 2, layer.width, layer.fontSize, 10, layer.fontWeight);
  ctx.restore();
}

async function drawCustomLayer(ctx, layer, member, logger) {
  switch (layer.type) {
    case "rect":
      drawRectLayer(ctx, layer);
      break;
    case "text":
      drawTextLayer(ctx, layer, member);
      break;
    case "image":
      await drawImageLayer(ctx, layer, logger);
      break;
    default:
      break;
  }
}

async function drawImageLayer(ctx, layer, logger) {
  if (!layer?.visible) return;
  const image = safeUrl(layer.imageUrl) ? await loadImageSource(layer.imageUrl, logger) : null;

  ctx.save();
  ctx.globalAlpha = layer.opacity / 100;
  roundedRect(ctx, layer.x, layer.y, layer.width, layer.height, layer.radius);
  ctx.clip();
  ctx.fillStyle = layer.color;
  ctx.fillRect(layer.x, layer.y, layer.width, layer.height);
  if (image) {
    drawImageToBox(ctx, image, layer.x, layer.y, layer.width, layer.height, layer.imageFit);
  }
  ctx.restore();

  if (layer.borderWidth > 0) {
    ctx.save();
    ctx.strokeStyle = layer.borderColor;
    ctx.lineWidth = layer.borderWidth;
    roundedRect(ctx, layer.x, layer.y, layer.width, layer.height, layer.radius);
    ctx.stroke();
    ctx.restore();
  }
}

async function loadAvatarOrCustom(member, layer, logger) {
  const url = safeUrl(layer.imageUrl) ||
    member?.displayAvatarURL?.({ extension: "png", size: 256 }) ||
    member?.user?.displayAvatarURL?.({ extension: "png", size: 256 });
  if (!url) return null;
  return loadImageSource(url, logger);
}

async function loadImageSource(url, logger) {
  if (isDataImage(url)) {
    try {
      return loadImage(dataImageBuffer(url));
    } catch (error) {
      logger?.log?.(`[WelcomeImage] Data image load failed: ${error.message}`, "warn");
      return null;
    }
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`image load failed (${response.status})`);
    return loadImage(Buffer.from(await response.arrayBuffer()));
  } catch (error) {
    logger?.log?.(`[WelcomeImage] Remote load failed (${shortSource(url)}): ${error.message}`, "warn");
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function drawImageToBox(ctx, image, x, y, width, height, fit = "cover") {
  if (fit === "stretch") {
    ctx.drawImage(image, x, y, width, height);
    return;
  }

  const ratio = fit === "contain"
    ? Math.min(width / image.width, height / image.height)
    : Math.max(width / image.width, height / image.height);
  const drawW = image.width * ratio;
  const drawH = image.height * ratio;
  const drawX = x + (width - drawW) / 2;
  const drawY = y + (height - drawH) / 2;
  ctx.drawImage(image, drawX, drawY, drawW, drawH);
}

function createDefaultTemplate(id = "default", name = "Welcome card") {
  const width = DEFAULT_WIDTH;
  const height = DEFAULT_HEIGHT;
  return {
    id,
    name,
    width,
    height,
    background: {
      color: "#111820",
      imageUrl: "",
      fit: "cover",
      x: 0,
      y: 0,
      scale: 100,
      opacity: 100,
    },
    layers: defaultLayers(width, height),
    customLayers: [],
  };
}

function defaultLayers(width, height) {
  return {
    accentLeft: rectLayer("accentLeft", "Accent left", width * 0.07, height * 0.12, width * 0.33, height * 0.25, "#12c8d8", 22),
    accentRight: rectLayer("accentRight", "Accent right", width * 0.72, height * 0.53, width * 0.22, height * 0.24, "#12c8d8", 22),
    card: rectLayer("card", "Main card", width * 0.12, height * 0.16, width * 0.76, height * 0.68, "#202326", 34),
    badge: {
      ...rectLayer("badge", "Member badge", width * 0.34, height * 0.20, width * 0.32, 28, "rgba(255,255,255,0.10)", 7),
      type: "badge",
      text: "Member #{member_count}",
      textColor: "#d7dde7",
      fontSize: 14,
      fontWeight: 700,
      align: "center",
    },
    avatar: {
      id: "avatar",
      name: "User avatar",
      type: "avatar",
      visible: true,
      x: width / 2 - 56,
      y: height * 0.29,
      width: 112,
      height: 112,
      size: 112,
      radius: 56,
      opacity: 100,
      borderColor: "#ffffff",
      borderWidth: 8,
      imageUrl: "",
      imageFit: "cover",
    },
    title: textLayer("title", "Title", "Welcome {user_display}", width * 0.16, height * 0.64, width * 0.68, 44, "#ffffff", 34, 900, "center"),
    subtitle: textLayer("subtitle", "Subtitle", "to {server_name}", width * 0.22, height * 0.76, width * 0.56, 32, "#d7dde7", 22, 800, "center", true),
  };
}

function rectLayer(id, name, x, y, width, height, color, radius) {
  return {
    id,
    name,
    type: "rect",
    visible: true,
    x: Math.round(x),
    y: Math.round(y),
    width: Math.round(width),
    height: Math.round(height),
    radius: Math.round(radius),
    color,
    opacity: 100,
  };
}

function textLayer(id, name, text, x, y, width, height, textColor, fontSize, fontWeight, align, italic = false) {
  return {
    id,
    name,
    type: "text",
    visible: true,
    x: Math.round(x),
    y: Math.round(y),
    width: Math.round(width),
    height: Math.round(height),
    text,
    textColor,
    fontSize,
    fontWeight,
    align,
    italic,
    opacity: 100,
  };
}

function normalizeTemplate(raw = {}, index = 0) {
  const fallback = index === 0
    ? createDefaultTemplate("default", "Welcome card")
    : createDefaultTemplate(`image-${index + 1}`, `Welcome card ${index + 1}`);
  const width = clampNumber(raw.width, 420, 1200, fallback.width);
  const height = clampNumber(raw.height, 220, 640, fallback.height);
  const migrated = migrateOldTemplate(raw, width, height);

  return {
    id: safeId(raw.id) || fallback.id,
    name: stringValue(raw.name || fallback.name, 1, 48),
    width,
    height,
    background: normalizeBackground(raw.background || migrated.background || fallback.background, raw),
    layers: normalizeLayers(raw.layers || migrated.layers || fallback.layers, width, height),
    customLayers: normalizeCustomLayers(raw.customLayers || [], width, height),
  };
}

function migrateOldTemplate(raw, width, height) {
  if (raw.layers) return {};

  const layers = defaultLayers(width, height);
  layers.card.color = colorValue(raw.cardColor, layers.card.color);
  layers.card.radius = clampNumber(raw.borderRadius, 0, 120, layers.card.radius);
  layers.card.opacity = clampNumber(raw.opacity, 0, 100, layers.card.opacity);
  layers.accentLeft.color = colorValue(raw.accentColor, layers.accentLeft.color);
  layers.accentRight.color = colorValue(raw.accentColor, layers.accentRight.color);
  layers.title.text = stringValue(raw.title || layers.title.text, 0, 140);
  layers.title.textColor = colorValue(raw.textColor, layers.title.textColor);
  layers.subtitle.text = stringValue(raw.subtitle || layers.subtitle.text, 0, 140);
  layers.subtitle.textColor = colorValue(raw.mutedColor, layers.subtitle.textColor);
  layers.badge.text = stringValue(raw.badge || layers.badge.text, 0, 100);
  layers.badge.textColor = colorValue(raw.mutedColor, layers.badge.textColor);
  layers.avatar.size = clampNumber(raw.avatarSize, 40, 260, layers.avatar.size);
  layers.avatar.width = layers.avatar.size;
  layers.avatar.height = layers.avatar.size;
  layers.avatar.radius = Math.round(layers.avatar.size / 2);
  layers.avatar.imageUrl = stringValue(raw.customLogo || "", 0, MAX_IMAGE_SOURCE_LENGTH);

  return {
    background: {
      color: colorValue(raw.backgroundColor, "#111820"),
      imageUrl: stringValue(raw.bgImage || "", 0, MAX_IMAGE_SOURCE_LENGTH),
      fit: "cover",
      x: 0,
      y: 0,
      scale: 100,
      opacity: 100,
    },
    layers,
  };
}

function normalizeBackground(raw = {}, old = {}) {
  const fit = ["cover", "contain", "stretch", "original"].includes(raw.fit) ? raw.fit : "cover";
  return {
    color: colorValue(raw.color || old.backgroundColor, "#111820"),
    imageUrl: stringValue(raw.imageUrl || old.bgImage || "", 0, MAX_IMAGE_SOURCE_LENGTH),
    fit,
    x: clampNumber(raw.x, -1200, 1200, 0),
    y: clampNumber(raw.y, -640, 640, 0),
    scale: clampNumber(raw.scale, 10, 300, 100),
    opacity: clampNumber(raw.opacity, 0, 100, 100),
  };
}

function normalizeLayers(raw = {}, width, height) {
  const fallback = defaultLayers(width, height);
  const out = {};
  for (const [id, base] of Object.entries(fallback)) {
    out[id] = normalizeLayer({ ...base, ...(raw[id] || {}) }, base, width, height);
  }
  return out;
}

function normalizeLayer(raw, fallback, canvasWidth, canvasHeight) {
  const type = fallback.type;
  const maxX = canvasWidth * 2;
  const maxY = canvasHeight * 2;
  const layer = {
    ...fallback,
    ...raw,
    id: fallback.id,
    type,
    name: stringValue(raw.name || fallback.name, 1, 42),
    visible: raw.visible !== false,
    x: clampNumber(raw.x, -maxX, maxX, fallback.x),
    y: clampNumber(raw.y, -maxY, maxY, fallback.y),
    width: clampNumber(raw.width, 1, maxX, fallback.width),
    height: clampNumber(raw.height, 1, maxY, fallback.height),
    opacity: clampNumber(raw.opacity, 0, 100, fallback.opacity),
  };

  if (type === "rect" || type === "badge") {
    layer.radius = clampNumber(raw.radius, 0, 180, fallback.radius);
    layer.color = colorValue(raw.color, fallback.color);
  }

  if (type === "badge" || type === "text") {
    layer.text = stringValue(raw.text || fallback.text, 0, 160);
    layer.textColor = colorValue(raw.textColor, fallback.textColor);
    layer.fontSize = clampNumber(raw.fontSize, 8, 96, fallback.fontSize);
    layer.fontWeight = clampNumber(raw.fontWeight, 100, 1000, fallback.fontWeight);
    layer.align = ["left", "center", "right"].includes(raw.align) ? raw.align : fallback.align;
    layer.italic = Boolean(raw.italic);
  }

  if (type === "avatar") {
    layer.size = clampNumber(raw.size || raw.width, 32, 260, fallback.size);
    layer.width = layer.size;
    layer.height = layer.size;
    layer.radius = clampNumber(raw.radius, 0, 160, fallback.radius);
    layer.borderColor = colorValue(raw.borderColor, fallback.borderColor);
    layer.borderWidth = clampNumber(raw.borderWidth, 0, 30, fallback.borderWidth);
    layer.imageUrl = stringValue(raw.imageUrl || "", 0, MAX_IMAGE_SOURCE_LENGTH);
    layer.imageFit = imageFitValue(raw.imageFit, fallback.imageFit);
  }

  return layer;
}

function normalizeCustomLayers(raw = [], canvasWidth, canvasHeight) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((layer, index) => normalizeCustomLayer(layer, index, canvasWidth, canvasHeight))
    .filter(Boolean)
    .slice(0, 30);
}

function normalizeCustomLayer(raw = {}, index, canvasWidth, canvasHeight) {
  const type = ["rect", "text", "image"].includes(raw.type) ? raw.type : "text";
  const fallback = customLayerFallback(type, index, canvasWidth, canvasHeight);
  const layer = normalizeLayer({ ...fallback, ...raw }, fallback, canvasWidth, canvasHeight);
  layer.id = safeId(raw.id) || fallback.id;
  layer.custom = true;

  if (type === "image") {
    layer.imageUrl = stringValue(raw.imageUrl || "", 0, MAX_IMAGE_SOURCE_LENGTH);
    layer.color = colorValue(raw.color, fallback.color);
    layer.radius = clampNumber(raw.radius, 0, 180, fallback.radius);
    layer.borderColor = colorValue(raw.borderColor, fallback.borderColor);
    layer.borderWidth = clampNumber(raw.borderWidth, 0, 30, fallback.borderWidth);
    layer.imageFit = imageFitValue(raw.imageFit, fallback.imageFit);
  }

  return layer;
}

function customLayerFallback(type, index, canvasWidth, canvasHeight) {
  const id = `custom_${type}_${index + 1}`;
  const x = Math.round(canvasWidth * 0.25);
  const y = Math.round(canvasHeight * 0.25);

  if (type === "rect") {
    return rectLayer(id, `Shape ${index + 1}`, x, y, Math.round(canvasWidth * 0.28), Math.round(canvasHeight * 0.16), "#3158ff", 18);
  }

  if (type === "image") {
    return {
      id,
      name: `Image ${index + 1}`,
      type: "image",
      visible: true,
      x,
      y,
      width: 180,
      height: 110,
      radius: 16,
      color: "rgba(255,255,255,0.10)",
      opacity: 100,
      imageUrl: "",
      imageFit: "cover",
      borderColor: "#ffffff",
      borderWidth: 0,
    };
  }

  return textLayer(id, `Text ${index + 1}`, "New text", x, y, Math.round(canvasWidth * 0.5), 42, "#ffffff", 28, 800, "center");
}

function parseImageText(text, member) {
  const displayName = member?.displayName || member?.user?.globalName || member?.user?.username || "New member";
  const username = member?.user?.username || displayName;
  const guildName = member?.guild?.name || "Server";
  const memberCount = String(member?.guild?.memberCount || 0);

  return String(text || "")
    .replaceAll("{user}", displayName)
    .replaceAll("{user_name}", username)
    .replaceAll("{user_display}", displayName)
    .replaceAll("{server_name}", guildName)
    .replaceAll("{member_count}", memberCount)
    .replaceAll("{server_memberCount}", memberCount)
    .replaceAll("${userglobalnickname}", displayName)
    .replaceAll("$userglobalnickname", displayName)
    .replaceAll("${guildname}", guildName)
    .replaceAll("$guildname", guildName)
    .replaceAll("${guildmembercount}", memberCount)
    .replaceAll("$guildmembercount", memberCount);
}

function fitAndDrawText(ctx, text, x, y, maxWidth, maxSize, minSize, weight) {
  const value = String(text || "").trim();
  if (!value) return;

  let size = maxSize;
  do {
    ctx.font = `${weight} ${size}px Arial`;
    if (ctx.measureText(value).width <= maxWidth || size <= minSize) break;
    size -= 1;
  } while (size > minSize);

  ctx.fillText(value, x, y);
}

function textX(layer) {
  if (layer.align === "left") return layer.x;
  if (layer.align === "right") return layer.x + layer.width;
  return layer.x + layer.width / 2;
}

function roundedRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function safeUrl(value) {
  const text = stringValue(value, 0, MAX_IMAGE_SOURCE_LENGTH);
  if (!text) return "";
  if (isDataImage(text)) return text;
  try {
    const url = new URL(text);
    return ["http:", "https:"].includes(url.protocol) ? url.toString() : "";
  } catch {
    return "";
  }
}

function isDataImage(value) {
  return /^data:image\/(?:png|jpe?g|webp|gif);base64,/i.test(String(value || ""));
}

function dataImageBuffer(value) {
  const [, body = ""] = String(value || "").split(",", 2);
  return Buffer.from(body, "base64");
}

function shortSource(value) {
  const text = String(value || "");
  if (isDataImage(text)) return "data:image";
  return text.length > 160 ? `${text.slice(0, 157)}...` : text;
}

function colorValue(value, fallback) {
  const text = String(value || "").trim();
  if (/^#[0-9a-f]{6}$/i.test(text)) return text;
  if (/^rgba?\(/i.test(text)) return text;
  return fallback;
}

function imageFitValue(value, fallback = "cover") {
  return ["cover", "contain", "stretch"].includes(value) ? value : fallback || "cover";
}

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, Math.round(number)));
}

function stringValue(value, min, max) {
  const text = String(value || "").trim();
  if (text.length < min) return "";
  return text.slice(0, max);
}

function safeId(value) {
  return stringValue(value, 0, 64).replace(/[^a-z0-9_-]/gi, "");
}

function safeFilePart(value) {
  return safeId(value) || "card";
}

function initial(value) {
  return String(value || "A").trim().charAt(0).toUpperCase() || "A";
}

module.exports = {
  DEFAULT_DYNAMIC_IMAGE_TEMPLATE,
  normalizeWelcomeDynamicImages,
  buildWelcomeImageAttachment,
};
