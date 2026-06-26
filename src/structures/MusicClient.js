/** @format */

const { Client, GatewayIntentBits, Collection, Events, Options } = require("discord.js");
const { ClusterClient, getInfo } = require("discord-hybrid-sharding");
const loadPlayerManager = require("../loaders/loadPlayerManager");
const initializePremiumChecks = require("../utils/premiumChecks");
const { loadEmojiLibrary } = require("../utils/emojiLibrary");
const { syncClientOwnerIds } = require("../utils/owners");
const startDashboard = require("../dashboard/server");
const config = require("../config.js");
const { getDb } = require("../db/client");

class MusicBot extends Client {
  constructor() {
    const clusterInfo = resolveClusterInfo();
    super({
      intents: resolveIntents(config.intents),
      properties: {
        browser: config.app?.browser,
      },
      allowedMentions: config.allowedMentions,
      makeCache: Options.cacheWithLimits({
        MessageManager: { maxSize: 50 },
        GuildMemberManager: { maxSize: 200, keepOverLimit: (m) => m.id === m.client.user?.id },
        PresenceManager: { maxSize: 2000 },
        ReactionManager: 0,
        ReactionUserManager: 0,
        GuildEmojiManager: 0,
        GuildStickerManager: 0,
        StageInstanceManager: 0,
        ThreadManager: 0,
        ThreadMemberManager: 0,
        GuildScheduledEventManager: 0,
        VoiceStateManager: { maxSize: 1000 },
      }),
      sweepers: {
        ...Options.defaultSweepers,
        messages: {
          interval: 300,
          lifetime: 600,
        },
      },
      ...(clusterInfo ? {
        shards: clusterInfo.SHARD_LIST,
        shardCount: clusterInfo.TOTAL_SHARDS,
      } : {}),
    });

    this.commands = new Collection();
    this.slashCommands = new Collection();
    this.config = config;
    this.owner = this.config.ownerID || this.config.owners?.[0];
    this.owners = syncClientOwnerIds(this);
    this.prefix = this.config.prefix;
    this.topgg = null;
    this.embedColor = this.config.embedColor;
    this.color = this.config.color || this.config.embedColor;
    this.button = require("../custom/button.js");
    this.embed = require("../custom/embed.js")(this.embedColor);
    require("../custom/numformat")(this);
    this.aliases = new Collection();
    this.logger = require("../utils/logger.js");
    this.emoji = require("../utils/emoji.json");
    installClientReadyAlias(this);
    this.cluster = clusterInfo ? new ClusterClient(this) : null;
    if (!this.cluster) {
      this.logger.log("[Cluster] Running without ClusterManager. Use npm start/node Shard.js for production sharding.", "warn");
    }
    if (!this.token) this.token = this.config.token;
    this.manager = null;
    this.spamMap = new Map();
    this.cooldowns = new Collection();

    this._connectPostgres().catch((err) => {
      this.logger.log(`[DB] Failed to start connection: ${err.stack || err}`, "error");
    });

    initializePremiumChecks(this);
    loadPlayerManager(this);
    this.once(Events.ClientReady, () => {
      startDashboard(this).catch((err) => {
        this.logger.log(`[Dashboard] Startup failed: ${err.stack || err}`, "error");
      });

      // Start 5-minute memory monitoring logging loop
      setInterval(() => {
        const used = process.memoryUsage();
        this.logger.log(
          `Memory: RSS ${Math.round(used.rss / 1024 / 1024)}MB | Heap ${Math.round(
            used.heapUsed / 1024 / 1024
          )}MB | External ${Math.round(used.external / 1024 / 1024)}MB`,
          "log"
        );
      }, 300_000);
    });

    [
      "loadAntinukes",
      "loadAutoMods",
      "loadClients",
      "loadCommands",
      "loadNodes",
      "loadSlashCommands",
      "loadPlayers",
    ].forEach((handler) => {
      require(`../loaders/${handler}`)(this);
    });
  }
  async _connectPostgres() {
    // Just try to get the DB client instance which validates DATABASE_URL and initiates a handshake
    const db = getDb();
    this.logger.log("[DB] Database connected", "ready");
  }

  async connect() {
    this.emoji = await loadEmojiLibrary(this);
    return super.login(this.token);
  }
}

function resolveClusterInfo() {
  try {
    return getInfo();
  } catch {
    return null;
  }
}

function installClientReadyAlias(client) {
  for (const method of ["on", "once", "prependListener", "prependOnceListener"]) {
    const original = client[method]?.bind(client);
    if (typeof original !== "function") continue;

    client[method] = (eventName, listener, ...args) => {
      const event = eventName === "ready" ? Events.ClientReady : eventName;
      return original(event, listener, ...args);
    };
  }
}

function resolveIntents(intents) {
  if (typeof intents === "number") return intents;
  if (!Array.isArray(intents)) return intents;

  return intents.map((intent) => {
    if (typeof intent === "number") return intent;
    return GatewayIntentBits[intent];
  }).filter(Boolean);
}

module.exports = MusicBot;
