const fallbackEmojis = require("./emoji.json");

const API_BASE = "https://discord.com/api/v10";
const DEFAULT_TIMEOUT_MS = 10000;
const LIBRARY_META_FIELDS = new Set([
  "endpoints",
  "library",
  "count",
  "total",
  "updatedAt",
  "createdAt",
  "version",
]);

const EMOJI_ALIASES = {
  playing: "Playing",
  stop: "resume",
  skip: "forward",
  addsong: "autoplay",
  replay: "loop",
  role: "roles",
  delete: "del",
  remove: "del",
  tick: "yes",
  cross: "no",
  corss: "no",
  warning: "warn",
  jump: "join",
  information: "info",
  moderation: "mod",
  antinuke: "anti",
  web: "utility",
  fams: "Fams",
  owner: "Owners",
  dev: "OxP",
  admin: "Admin",
  staff: "Staffs",
  partner: "Partners",
  vip: "Vips",
  friend: "Homies",
  gfriend: "Homies",
  bug: "Mods",
  os: "ownerspecial",
  specialone: "special",
  loveone: "love",
  insta: "Insta",
  instagram: "Insta",
  snap: "Snap",
  musicspecial: "music",
  noprefix: "premium",
  twitter: "discord",
};

for (const letter of "abcdefghijklmnopqrstuvwxyz") {
  EMOJI_ALIASES[letter] = letter === "h" ? "h_simpler" : `${letter.toUpperCase()}_simper`;
}

async function loadEmojiLibrary(client) {
  const settings = client.config?.emojiLibrary || {};
  const url = settings.url;
  const timeoutMs = Number(settings.timeoutMs || DEFAULT_TIMEOUT_MS);
  const useApplicationEmojis = settings.useApplicationEmojis !== false;

  if (!url) {
    client.logger?.log("[EmojiLibrary] No remote emoji library URL configured.", "warn");
    return fallbackEmojis;
  }

  try {
    const { libraries, warnings: endpointWarnings } = await fetchLibraries(
      url,
      settings.fallbackUrls,
      timeoutMs,
      client,
    );
    const libraryEmojis = dedupeLibraryEmojis(libraries.flatMap((source) => normalizeLibraryEmojis(source)));
    const resolved = { ...fallbackEmojis };
    const imageUrls = {};
    let applicationCount = 0;
    let publicCount = 0;
    let applicationWarning = "";

    for (const item of libraryEmojis) {
      if (!item?.name) continue;
      if (item.url) imageUrls[item.name] = item.url;

      const publicValue = emojiValueFromLibraryItem(item);
      if (publicValue) {
        resolved[item.name] = publicValue;
        resolved[item.name.toLowerCase()] = publicValue;
        publicCount++;
      }
    }

    if (useApplicationEmojis) {
      const token = client.token || client.config?.token;
      if (!token) {
        applicationWarning = " Application emoji lookup skipped: missing bot token.";
      } else {
        try {
          const applicationId = await getApplicationId(token, client.config?.clientId, timeoutMs);
          const applicationEmojis = await listApplicationEmojis(token, applicationId, timeoutMs);
          const byName = new Map(applicationEmojis.filter((emoji) => emoji.name).map((emoji) => [emoji.name, emoji]));

          const missingEmojis = [];
          for (const item of libraryEmojis) {
            if (!item?.name) continue;

            const emoji = byName.get(item.applicationName) || byName.get(item.emojiName) || byName.get(item.name);
            if (!emoji?.id) {
              if (item.url) missingEmojis.push(item);
              continue;
            }

            const value = formatEmoji(emoji.name, emoji.id, emoji.animated);
            resolved[item.name] = value;
            resolved[item.name.toLowerCase()] = value;
            applicationCount++;
          }

          for (const [key, remoteName] of Object.entries(EMOJI_ALIASES)) {
            const emoji = byName.get(remoteName);
            if (emoji?.id) resolved[key] = formatEmoji(emoji.name, emoji.id, emoji.animated);
          }

          if (missingEmojis.length > 0) {
            // Start background sync
            syncMissingEmojis(token, applicationId, missingEmojis, byName, resolved, client, timeoutMs).catch((err) => {
              client.logger?.log(`[EmojiLibrary] Background sync error: ${err.message || err}`, "warn");
            });
          }
        } catch (error) {
          applicationWarning = ` Application emoji lookup skipped: ${error.message || error}.`;
        }
      }
    }

    for (const [key, remoteName] of Object.entries(EMOJI_ALIASES)) {
      if (resolved[key]) continue;
      const value = resolved[remoteName] || resolved[String(remoteName).toLowerCase()];
      if (value) resolved[key] = value;
    }

    client.emojiImages = imageUrls;
    client.config.emojis = resolved;
    const endpointWarning = endpointWarnings.length
      ? ` Endpoint fallback warnings: ${endpointWarnings.length}.`
      : "";
    client.logger?.log(
      `[EmojiLibrary] Loaded ${Object.keys(resolved).length} emoji keys from ${url} using ${libraries.length} source(s) (${applicationCount} application emojis, ${publicCount} public strings, ${Object.keys(imageUrls).length} public images, ${Object.keys(fallbackEmojis).length} fallback).${applicationWarning}${endpointWarning}`,
      applicationWarning || endpointWarning ? "warn" : "ready",
    );

    return resolved;
  } catch (error) {
    client.logger?.log(`[EmojiLibrary] Failed to load remote emojis: ${error.message || error}`, "warn");
    return fallbackEmojis;
  }
}

async function syncMissingEmojis(token, applicationId, missingEmojis, byName, resolved, client, timeoutMs) {
  client.logger?.log(`[EmojiLibrary] Found ${missingEmojis.length} missing application emojis. Starting background sync...`, "info");
  
  let successCount = 0;
  let failCount = 0;

  for (const item of missingEmojis) {
    if (!item?.name || !item?.url) continue;
    try {
      const response = await fetchWithTimeout(item.url, {}, timeoutMs);
      if (!response.ok) {
        failCount++;
        continue;
      }
      const arrayBuffer = await response.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString("base64");
      const mimeType = item.mimeType || (item.animated ? "image/gif" : "image/webp");
      const dataURI = `data:${mimeType};base64,${base64}`;

      const newEmoji = await discordRequest(
        token,
        `/applications/${applicationId}/emojis`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: item.name,
            image: dataURI,
          }),
        },
        timeoutMs,
      );

      if (newEmoji?.id) {
        const value = formatEmoji(newEmoji.name, newEmoji.id, newEmoji.animated);
        resolved[item.name] = value;
        resolved[item.name.toLowerCase()] = value;
        
        for (const [key, remoteName] of Object.entries(EMOJI_ALIASES)) {
          if (remoteName === item.name) {
            resolved[key] = value;
          }
        }
        
        byName.set(newEmoji.name, newEmoji);
        successCount++;
      } else {
        failCount++;
      }
      
      // Delay to respect rate limits
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (error) {
      failCount++;
      client.logger?.log(`[EmojiLibrary] Failed to sync emoji "${item.name}": ${error.message || error}`, "warn");
      if (error.message && error.message.includes("429")) {
        // Wait longer on 429
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }
  }

  client.logger?.log(`[EmojiLibrary] Background sync finished: ${successCount} synced, ${failCount} failed.`, "ready");
}

async function fetchLibraries(sourceUrl, fallbackUrls, timeoutMs, client) {
  const libraries = [];
  const warnings = [];
  const seen = new Set();

  async function tryFetch(endpoint, label) {
    const normalized = normalizeUrlForCompare(endpoint);
    if (!normalized || seen.has(normalized)) return null;
    seen.add(normalized);

    try {
      const library = await fetchLibrary(endpoint, timeoutMs);
      libraries.push(library);
      return library;
    } catch (error) {
      const message = `${label} failed ${endpoint}: ${error.message || error}`;
      warnings.push(message);
      client.logger?.log(`[EmojiLibrary] ${message}`, "warn");
      return null;
    }
  }

  const primary = await tryFetch(sourceUrl, "Primary endpoint");
  const endpoints = endpointFallbackUrls(primary, sourceUrl);
  const guessed = guessFallbackUrls(sourceUrl);

  for (const endpoint of [...toArray(fallbackUrls), ...endpoints, ...guessed]) {
    await tryFetch(endpoint, "Fallback endpoint");
  }

  if (!libraries.length) {
    throw new Error(warnings.join("; ") || "No emoji library endpoints loaded.");
  }

  return { libraries, warnings };
}

function toArray(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") return value.split(",");
  return [];
}

function emojiValueFromLibraryItem(item) {
  if (typeof item.emoji === "string" && item.emoji.trim()) return item.emoji.trim();
  if (typeof item.value === "string" && item.value.trim()) {
    if (/^\d{16,22}$/.test(item.value.trim()) && item.name) {
      return formatEmoji(item.name, item.value.trim(), item.animated);
    }
    return item.value.trim();
  }
  if (typeof item.string === "string" && item.string.trim()) return item.string.trim();
  if (item.id && item.name) return formatEmoji(item.emojiName || item.name, String(item.id).trim(), item.animated);
  return "";
}

function normalizeLibraryEmojis(library) {
  const items = [];
  const push = (item, key = "") => {
    const normalized = normalizeLibraryEmojiItem(item, key);
    if (Array.isArray(normalized)) items.push(...normalized);
    else if (normalized) items.push(normalized);
  };

  if (Array.isArray(library)) {
    library.forEach((item) => push(item));
    return items;
  }

  if (typeof library === "string") {
    return parseLegacyEmojiText(library);
  }

  if (!library || typeof library !== "object") return items;

  for (const field of ["emojis", "emoji", "map", "items", "data"]) {
    const value = library[field];
    if (Array.isArray(value)) value.forEach((item) => push(item));
    else if (typeof value === "string") items.push(...parseLegacyEmojiText(value));
    else if (value && typeof value === "object") {
      for (const [key, item] of Object.entries(value)) push(item, key);
    }
  }

  if (!items.length) {
    for (const [key, item] of Object.entries(library)) {
      if (LIBRARY_META_FIELDS.has(key)) continue;
      push(item, key);
    }
  }

  return items.filter((item) => item?.name);
}

function normalizeLibraryEmojiItem(item, key = "") {
  if (typeof item === "string") {
    return parseLegacyEmojiText(item, key);
  }

  if (!item || typeof item !== "object") return null;

  const value = item.emoji || item.value || item.string || item.id || item.url || "";
  const parsed = typeof value === "string" || typeof value === "number"
    ? parseLegacyEmojiString(value, item.name || item.key || key || "")
    : null;
  const name = String(item.name || item.key || key || parsed?.name || "").trim();
  if (!name) return null;

  if (parsed) {
    return {
      ...item,
      ...parsed,
      name,
      emojiName: parsed.name || item.emojiName || name,
      applicationName: item.applicationName || parsed.name || name,
      value: parsed.emoji || item.value,
    };
  }

  return {
    ...item,
    name,
  };
}

function parseLegacyEmojiText(text, fallbackName = "") {
  const source = String(text || "");
  const direct = parseLegacyEmojiString(source, fallbackName);
  if (direct) return [withConfigName(direct, fallbackName)];

  const fromAssignments = [];
  const assignmentPattern = /(?<key>[A-Za-z0-9_]{1,64})\s*[:=]\s*(?<quote>["'`])?(?<value><a?:[A-Za-z0-9_]{1,64}:\d{16,22}>|(?:a|animated|gif)[:=][A-Za-z0-9_]{1,64}[:=]\d{16,22}(?:[:=](?:a|animated|gif|true|1))?|[A-Za-z0-9_]{1,64}[:=]\d{16,22}(?:[:=](?:a|animated|gif|true|1))?|\d{16,22}|https?:\/\/[^\s"'`,}]+)\k<quote>?/gi;

  for (const match of source.matchAll(assignmentPattern)) {
    const parsed = parseLegacyEmojiString(match.groups.value, match.groups.key);
    if (parsed) fromAssignments.push(withConfigName(parsed, match.groups.key));
  }

  if (fromAssignments.length) return fromAssignments;

  return source
    .split(/\r?\n|,/)
    .map((line) => withConfigName(parseLegacyEmojiString(line, fallbackName), fallbackName))
    .filter(Boolean);
}

function parseLegacyEmojiString(value, fallbackName = "") {
  const text = String(value || "").trim().replace(/;$/, "");
  if (!text) return null;

  const full = text.match(/^<(?<animated>a?):(?<name>[A-Za-z0-9_]{1,64}):(?<id>\d{16,22})>$/);
  if (full?.groups) {
    return {
      name: full.groups.name,
      id: full.groups.id,
      animated: full.groups.animated === "a",
      emoji: formatEmoji(full.groups.name, full.groups.id, full.groups.animated === "a"),
    };
  }

  if (/^https?:\/\//i.test(text)) {
    return fallbackName ? { name: fallbackName, url: text } : null;
  }

  const compact = text.match(/^(?:(?<animated>a|animated|gif)[:=])?(?<name>[A-Za-z0-9_]{1,64})\s*[:=]\s*(?<id>\d{16,22})(?:\s*[:=]\s*(?<flag>a|animated|gif|true|1))?$/i);
  if (compact?.groups) {
    const animated = Boolean(compact.groups.animated || /^(a|animated|gif|true|1)$/i.test(compact.groups.flag || ""));
    return {
      name: compact.groups.name,
      id: compact.groups.id,
      animated,
      emoji: formatEmoji(compact.groups.name, compact.groups.id, animated),
    };
  }

  if (/^\d{16,22}$/.test(text) && fallbackName) {
    return {
      name: fallbackName,
      id: text,
      animated: false,
      emoji: formatEmoji(fallbackName, text, false),
    };
  }

  return null;
}

function withConfigName(item, configName = "") {
  const name = String(configName || "").trim();
  if (!item || !name || item.name === name) return item;

  return {
    ...item,
    name,
    emojiName: item.emojiName || item.name,
    applicationName: item.applicationName || item.name,
  };
}

function endpointFallbackUrls(library, sourceUrl) {
  const endpoints = library?.endpoints;
  if (!endpoints || typeof endpoints !== "object") return [];

  const candidates = [endpoints.emojis, endpoints.module, endpoints.library]
    .map((endpoint) => String(endpoint || "").trim())
    .filter(Boolean);
  const source = normalizeUrlForCompare(sourceUrl);

  return [...new Set(candidates)].filter((endpoint) => normalizeUrlForCompare(endpoint) !== source);
}

function guessFallbackUrls(sourceUrl) {
  const url = String(sourceUrl || "").trim();
  if (!url) return [];

  const guesses = [];
  const add = (value) => {
    if (value && !guesses.includes(value)) guesses.push(value);
  };

  if (/\/api\/public\/library\/?$/i.test(url)) {
    add(url.replace(/\/api\/public\/library\/?$/i, "/api/public/emojis"));
    add(url.replace(/\/api\/public\/library\/?$/i, "/api/public/emojis.js"));
  } else if (/\/api\/public\/emojis\/?$/i.test(url)) {
    add(url.replace(/\/api\/public\/emojis\/?$/i, "/api/public/library"));
    add(url.replace(/\/api\/public\/emojis\/?$/i, "/api/public/emojis.js"));
  } else if (/\/api\/public\/emojis\.js\/?$/i.test(url)) {
    add(url.replace(/\/api\/public\/emojis\.js\/?$/i, "/api/public/library"));
    add(url.replace(/\/api\/public\/emojis\.js\/?$/i, "/api/public/emojis"));
  }

  return guesses;
}

function normalizeUrlForCompare(value) {
  return String(value || "").trim().replace(/\/+$/, "");
}

function dedupeLibraryEmojis(items) {
  const seen = new Set();
  const output = [];

  for (const item of items) {
    if (!item?.name) continue;
    const key = [
      item.name,
      item.id || "",
      item.emoji || item.value || item.string || "",
      item.url || "",
    ].join(":");
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(item);
  }

  return output;
}

async function getApplicationId(token, fallbackId, timeoutMs) {
  const application = await discordRequest(
    token,
    "/oauth2/applications/@me",
    { method: "GET" },
    timeoutMs,
  ).catch(() => null);

  if (application?.id) return application.id;
  if (fallbackId) return fallbackId;

  const user = await discordRequest(token, "/users/@me", { method: "GET" }, timeoutMs);
  return user.id;
}

async function listApplicationEmojis(token, applicationId, timeoutMs) {
  const response = await discordRequest(
    token,
    `/applications/${applicationId}/emojis`,
    { method: "GET" },
    timeoutMs,
  );
  return Array.isArray(response?.items) ? response.items : [];
}

async function discordRequest(token, endpoint, options, timeoutMs) {
  const response = await fetchWithTimeout(
    `${API_BASE}${endpoint}`,
    {
      ...options,
      headers: {
        Authorization: `Bot ${token}`,
        "User-Agent": "DiscordBot (RemoteEmojiLibrary, 1.0)",
        ...(options.headers || {}),
      },
    },
    timeoutMs,
  );

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Discord ${response.status}: ${body.slice(0, 300)}`);
  }

  if (response.status === 204) return null;
  return response.json();
}

async function fetchLibrary(url, timeoutMs) {
  const response = await fetchWithTimeout(url, {}, timeoutMs);
  if (!response.ok) throw new Error(`Emoji library ${response.status}`);
  const text = await response.text();
  return parseLibraryBody(text, response.headers.get("content-type") || "");
}

function parseLibraryBody(text, contentType = "") {
  const source = String(text || "").trim();
  if (!source) return {};

  if (contentType.includes("json")) return JSON.parse(source);

  try {
    return JSON.parse(source);
  } catch {}

  const jsObject = source
    .replace(/^export\s+default\s+/, "")
    .replace(/^module\.exports\s*=\s*/, "")
    .replace(/;$/, "")
    .trim();

  try {
    return JSON.parse(jsObject);
  } catch {
    return source;
  }
}

async function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function formatEmoji(name, id, animated) {
  return `<${animated ? "a" : ""}:${name}:${id}>`;
}

module.exports = {
  loadEmojiLibrary,
};
