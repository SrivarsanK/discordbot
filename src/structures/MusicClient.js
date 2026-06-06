/** @format */

const { Client, GatewayIntentBits, Collection, Events } = require("discord.js");
const mongoose = require("mongoose");
const { ClusterClient, getInfo } = require("discord-hybrid-sharding");
const loadPlayerManager = require("../loaders/loadPlayerManager");
const initializePremiumChecks = require("../utils/premiumChecks");
const { loadEmojiLibrary } = require("../utils/emojiLibrary");
const { syncClientOwnerIds } = require("../utils/owners");
const { repairPremiumIndexes } = require("../utils/premiumIndexes");
const startDashboard = require("../dashboard/server");
const config = require("../config.js");

class MusicBot extends Client {
  constructor() {
    const clusterInfo = resolveClusterInfo();
    super({
      intents: resolveIntents(config.intents),
      properties: {
        browser: config.app?.browser,
      },
      allowedMentions: config.allowedMentions,
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

    this._connectMongodb().catch((err) => {
      this.logger.log(`[DB] Failed to start connection: ${err.stack || err}`, "error");
    });

    initializePremiumChecks(this);
    loadPlayerManager(this);
    this.once(Events.ClientReady, () => {
      startDashboard(this).catch((err) => {
        this.logger.log(`[Dashboard] Startup failed: ${err.stack || err}`, "error");
      });
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
  async _connectMongodb() {
    if (!this.config.mongourl) {
      this.logger.log("[DB] Mongo URI is not set.", "warn");
      return;
    }

    const dbOptions = this.config.mongoOptions || {};

    mongoose.set("strictQuery", false);
    mongoose.Promise = global.Promise;

    mongoose.connection.on("connected", () => {
      this.logger.log("[DB] Database connected", "ready");
    });

    mongoose.connection.on("error", (err) => {
      this.logger.log(`[DB] Mongoose connection error: ${err.stack}`, "error");
    });

    mongoose.connection.on("disconnected", () => {
      this.logger.log("[DB] Mongoose disconnected", "error");
    });

    await mongoose.connect(this.config.mongourl, dbOptions);
    await repairPremiumIndexes(this.logger);
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
