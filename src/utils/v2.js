const {
  ContainerBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  MessageFlags,
  SectionBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  TextDisplayBuilder,
  ThumbnailBuilder,
} = require("discord.js");

const TEXT_LIMIT = 3500;

function v2(options) {
  if (typeof options === "string") return makePayload({ content: options });
  if (!options || typeof options !== "object" || Array.isArray(options)) return options;

  const hasContent = typeof options.content === "string" && options.content.length > 0;
  const hasEmbeds = Array.isArray(options.embeds) && options.embeds.length > 0;
  const hasComponents = Array.isArray(options.components) && options.components.length > 0;
  const alreadyV2 = hasFlag(options.flags, MessageFlags.IsComponentsV2);

  if (!hasContent && !hasEmbeds && !hasComponents && !alreadyV2) return options;
  return makePayload(options);
}

function makePayload(options) {
  const payload = { ...options };
  const container = new ContainerBuilder();
  const components = [];
  let hasContainerContent = false;

  for (const chunk of chunkText(payload.content)) {
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(chunk));
    hasContainerContent = true;
  }

  const embeds = Array.isArray(payload.embeds) ? payload.embeds : [];
  embeds.forEach((embed, index) => {
    if (hasContainerContent || index > 0) {
      container.addSeparatorComponents(
        new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small),
      );
    }

    const { text, image, thumbnail } = embedParts(embed);
    const textChunks = chunkText(text);

    if (thumbnail && textChunks.length) {
      const firstChunk = textChunks.shift();
      container.addSectionComponents(
        new SectionBuilder()
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(firstChunk))
          .setThumbnailAccessory(new ThumbnailBuilder({ media: { url: thumbnail } })),
      );
      hasContainerContent = true;
    }

    for (const chunk of textChunks) {
      container.addTextDisplayComponents(new TextDisplayBuilder().setContent(chunk));
      hasContainerContent = true;
    }

    const gallery = mediaGallery(image ? [image] : []);
    if (gallery) {
      container.addMediaGalleryComponents(gallery);
      hasContainerContent = true;
    }
  });

  if (hasContainerContent) components.push(container);
  if (Array.isArray(payload.components)) components.push(...payload.components);
  if (!components.length) components.push(new TextDisplayBuilder().setContent("-"));

  delete payload.content;
  delete payload.embeds;
  delete payload.ephemeral;

  payload.components = components;
  payload.flags = mergeFlags(
    payload.flags,
    MessageFlags.IsComponentsV2,
    options.ephemeral ? MessageFlags.Ephemeral : 0,
  );

  return payload;
}

function embedParts(embed) {
  const data = typeof embed?.toJSON === "function" ? embed.toJSON() : embed || {};
  const lines = [];

  if (data.author?.name) lines.push(`**${escapeBold(data.author.name)}**`);
  if (data.title) lines.push(data.url ? `### [${data.title}](${data.url})` : `### ${data.title}`);
  if (data.description) lines.push(data.description);

  if (Array.isArray(data.fields)) {
    for (const field of data.fields) {
      if (!field?.name && !field?.value) continue;
      lines.push(`**${escapeBold(field.name || "Field")}**\n${field.value || "-"}`);
    }
  }

  if (data.footer?.text) lines.push(`-# ${data.footer.text}`);
  if (data.timestamp) lines.push(`-# ${formatTimestamp(data.timestamp)}`);

  return {
    text: lines.join("\n\n") || "-",
    image: typeof data.image?.url === "string" ? data.image.url : null,
    thumbnail: typeof data.thumbnail?.url === "string" ? data.thumbnail.url : null,
  };
}

function mediaGallery(urls) {
  const gallery = new MediaGalleryBuilder();
  let count = 0;

  for (const url of [...new Set(urls.filter(Boolean))].slice(0, 10)) {
    try {
      gallery.addItems(new MediaGalleryItemBuilder().setURL(url));
      count += 1;
    } catch {}
  }

  return count ? gallery : null;
}

function chunkText(text) {
  if (typeof text !== "string" || !text.trim()) return [];

  const chunks = [];
  let remaining = text.trim();
  while (remaining.length > TEXT_LIMIT) {
    let splitAt = remaining.lastIndexOf("\n", TEXT_LIMIT);
    if (splitAt < TEXT_LIMIT * 0.5) splitAt = remaining.lastIndexOf(" ", TEXT_LIMIT);
    if (splitAt < TEXT_LIMIT * 0.5) splitAt = TEXT_LIMIT;
    chunks.push(remaining.slice(0, splitAt).trim() || "-");
    remaining = remaining.slice(splitAt).trim();
  }

  if (remaining) chunks.push(remaining);
  return chunks;
}

function mergeFlags(...flags) {
  return flags.reduce((bitfield, flag) => bitfield | flagValue(flag), 0);
}

function hasFlag(flags, flag) {
  return (flagValue(flags) & flag) === flag;
}

function flagValue(flag) {
  if (!flag) return 0;
  if (typeof flag === "number") return flag;
  if (typeof flag === "bigint") return Number(flag);
  if (typeof flag === "string") return MessageFlags[flag] || Number(flag) || 0;
  if (Array.isArray(flag)) return flag.reduce((bitfield, item) => bitfield | flagValue(item), 0);
  if (typeof flag.bitfield !== "undefined") return flagValue(flag.bitfield);
  return 0;
}

function escapeBold(value) {
  return String(value).replace(/\*/g, "\\*");
}

function formatTimestamp(timestamp) {
  const time = Date.parse(timestamp);
  if (Number.isNaN(time)) return String(timestamp);
  return `<t:${Math.floor(time / 1000)}:F>`;
}

module.exports = { v2 };
