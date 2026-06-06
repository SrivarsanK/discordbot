/** @format */

const fs = require("fs");
const path = require("path");

loadEnvFile(path.join(__dirname, "..", ".env"));

const clientId = env("DISCORD_CLIENT_ID");
const ownerId = env("OWNER_ID");
const topggBotId = env("TOPGG_BOT_ID", clientId);
const commandLogChannelId = env("COMMAND_LOG_CHANNEL_ID");
const backupUserId = env("BACKUP_USER_ID");
const protectedUserId = env("PROTECTED_USER_ID", backupUserId);
const mainWebhook = env("MAIN_WEBHOOK_URL");
const prefix = env("PREFIX");
const ownerIds = envList("OWNER_IDS", ",", ownerId);
const dokdoOwnerIds = envList("DOKDO_OWNER_IDS", ",", ownerId);
const statuses = envIndexedList("BOT_STATUS");

const config = {
  token: env("DISCORD_TOKEN"),
  clientId,
  clientSecret: env("DISCORD_CLIENT_SECRET"),
  prefix,
  ownerID: ownerId,
  owners: ownerIds,

  SpotifyID: env("SPOTIFY_ID"),
  SpotifySecret: env("SPOTIFY_SECRET"),
  spotify: {
    clientId: env("SPOTIFY_ID"),
    clientSecret: env("SPOTIFY_SECRET"),
    playlistPageLimit: envNumber("SPOTIFY_PLAYLIST_PAGE_LIMIT"),
    albumPageLimit: envNumber("SPOTIFY_ALBUM_PAGE_LIMIT"),
    searchLimit: envNumber("SPOTIFY_SEARCH_LIMIT"),
    searchMarket: env("SPOTIFY_SEARCH_MARKET"),
  },

  mongourl: env("MONGO_URI"),

  embedColor: env("EMBED_COLOR"),
  color: env("BOT_COLOR", env("EMBED_COLOR")),
  logs: env("LOG_WEBHOOK_URL", mainWebhook),
  topgg: env("TOPGG_TOKEN"),
  topggToken: env("TOPGG_TOKEN"),
  topggBotId,
  invitePermissions: env("INVITE_PERMISSIONS"),
  footerText: env("FOOTER_TEXT"),
  emojiLibrary: {
    url: env("EMOJI_LIBRARY_URL"),
    fallbackUrls: envList("EMOJI_LIBRARY_FALLBACK_URLS"),
    timeoutMs: envNumber("EMOJI_LIBRARY_TIMEOUT_MS"),
    useApplicationEmojis: envBool("EMOJI_LIBRARY_USE_APPLICATION", "true"),
  },

  dokdo: {
    prefix: env("DOKDO_PREFIX"),
    owners: dokdoOwnerIds,
  },

  app: {
    name: env("BOT_NAME"),
    userAgent: env("LAVALINK_USER_AGENT"),
    browser: env("DISCORD_BROWSER"),
    commandLogChannelId,
    backupUserId,
    protectedUserId,
    antinukeLogChannelName: env("ANTINUKE_LOG_CHANNEL_NAME"),
    statuses,
    statusIntervalMs: envNumber("STATUS_INTERVAL_MS"),
  },

  cluster: {
    shardCount: envNumber("SHARD_COUNT"),
    shardsPerCluster: envNumber("SHARDS_PER_CLUSTER"),
    restartMax: envNumber("CLUSTER_RESTART_MAX"),
    restartInterval: envNumber("CLUSTER_RESTART_INTERVAL"),
    respawn: envBool("CLUSTER_RESPAWN"),
    mode: env("CLUSTER_MODE"),
  },

  mongoOptions: {
    autoIndex: envBool("MONGO_AUTO_INDEX"),
    connectTimeoutMS: envNumber("MONGO_CONNECT_TIMEOUT_MS"),
    family: envNumber("MONGO_FAMILY"),
  },

  intents: envList("INTENTS"),

  allowedMentions: {
    parse: envList("ALLOWED_MENTION_PARSE"),
    repliedUser: envBool("ALLOWED_MENTION_REPLIED_USER"),
  },

  node_source: env("NODE_SOURCE"),
  node_options: {
    moveOnDisconnect: envBool("NODE_MOVE_ON_DISCONNECT"),
    resume: envBool("NODE_RESUME"),
    resumeTimeout: envNumber("NODE_RESUME_TIMEOUT"),
    reconnectTries: envNumber("NODE_RECONNECT_TRIES"),
    restTimeout: envNumber("NODE_REST_TIMEOUT"),
    userAgent: env("LAVALINK_USER_AGENT"),
  },
  nodes: [
    {
      url: env("NODE_URL"),
      name: env("NODE_NAME"),
      auth: env("NODE_AUTH"),
      secure: envBool("NODE_SECURE"),
    },
  ],

  Webhooks: {
    black: env("BLACKLIST_WEBHOOK_URL", mainWebhook),
    player_create: env("PLAYER_CREATE_WEBHOOK_URL", mainWebhook),
    player_delete: env("PLAYER_DELETE_WEBHOOK_URL", mainWebhook),
    guild_join: env("GUILD_JOIN_WEBHOOK_URL", mainWebhook),
    guild_leave: env("GUILD_LEAVE_WEBHOOK_URL", mainWebhook),
    cmdrun: env("COMMAND_RUN_WEBHOOK_URL", mainWebhook),
  },

  slashCommands: {
    deployOnReady: envBool("DEPLOY_SLASH_ON_READY"),
  },

  dashboard: {
    enabled: envBool("DASHBOARD_ENABLED", "true"),
    host: env("DASHBOARD_HOST", "0.0.0.0"),
    port: envNumber("DASHBOARD_PORT", 3000),
    publicUrl: trimTrailingSlash(env("DASHBOARD_PUBLIC_URL", "http://localhost:3000")),
    sessionSecret: env("DASHBOARD_SESSION_SECRET", env("DISCORD_TOKEN")),
    cookieName: env("DASHBOARD_COOKIE_NAME", "dsc_dashboard"),
    sessionTtlMs: envNumber("DASHBOARD_SESSION_TTL_MS", 1000 * 60 * 60 * 24 * 7),
    requestTimeoutMs: envNumber("DASHBOARD_REQUEST_TIMEOUT_MS", 10000),
    clusterId: envNumber("DASHBOARD_CLUSTER_ID", 0),
  },
};

module.exports = config;

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;

  const source = fs.readFileSync(filePath, "utf8");
  for (const line of source.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;

    const [, key, rawValue] = match;
    if (process.env[key] !== undefined) continue;
    process.env[key] = parseEnvValue(rawValue);
  }
}

function parseEnvValue(value) {
  value = value.trim();
  if (!value) return "";

  const quote = value[0];
  if ((quote === "\"" || quote === "'") && value[value.length - 1] === quote) {
    const inner = value.slice(1, -1);
    if (quote === "\"") {
      try {
        return JSON.parse(value);
      } catch {
        return inner;
      }
    }
    return inner;
  }

  return value;
}

function env(key, fallback = "") {
  const value = process.env[key];
  return value === undefined || value === "" ? fallback : value;
}

function envList(key, separator = ",", fallback = "") {
  return env(key, fallback)
    .split(separator)
    .map((item) => item.trim())
    .filter(Boolean);
}

function envIndexedList(prefixKey) {
  const values = [];
  for (let index = 1; index <= 20; index += 1) {
    const value = env(`${prefixKey}_${index}`);
    if (value) values.push(value);
  }
  return values;
}

function envNumber(key, fallback = 0) {
  const value = Number(env(key, String(fallback)));
  const defaultValue = Number(fallback);
  return Number.isFinite(value) ? value : Number.isFinite(defaultValue) ? defaultValue : 0;
}

function envBool(key, fallback = "") {
  return parseBoolean(env(key, fallback));
}

function parseBoolean(value) {
  if (typeof value === "string") {
    value = value.trim().toLowerCase();
  }

  switch (value) {
    case true:
    case "true":
    case "1":
    case "yes":
    case "on":
      return true;
    default:
      return false;
  }
}

function trimTrailingSlash(value) {
  return String(value || "").replace(/\/+$/, "");
}
