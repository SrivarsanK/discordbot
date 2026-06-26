/** @format */
const ServerStats = require("../schema/serverstats");
const { ChannelType } = require("discord.js");

/**
 * Replaces placeholders in a template string with actual guild stats.
 * @param {string} template The template pattern.
 * @param {import("discord.js").Guild} guild The guild object.
 * @param {import("discord.js").Collection} [members] Optional fetched member collection.
 * @returns {string} The formatted channel name.
 */
function parseTemplate(template, guild, members = null) {
  const memberList = members || guild.members.cache;
  const total = guild.memberCount || memberList.size || 0;
  
  // Distinguish bot and human
  const bots = memberList.filter((m) => m.user?.bot).size || 0;
  const humans = Math.max(0, total - bots);
  
  // Calculate online members from presence cache
  const online = memberList.filter((m) => m.presence && m.presence.status !== "offline").size || 0;
  const offline = Math.max(0, total - online);
  
  const channels = guild.channels.cache.size || 0;
  const roles = guild.roles.cache.size || 0;
  const boosts = guild.premiumSubscriptionCount || 0;
  const tier = guild.premiumTier || 0;

  return template
    .replace(/{total}/g, total)
    .replace(/{members}/g, total)
    .replace(/{humans}/g, humans)
    .replace(/{bots}/g, bots)
    .replace(/{online}/g, online)
    .replace(/{offline}/g, offline)
    .replace(/{channels}/g, channels)
    .replace(/{roles}/g, roles)
    .replace(/{boosts}/g, boosts)
    .replace(/{tier}/g, tier);
}

// In-memory cooldowns and timers to avoid hitting Discord's channel rename rate limit (2 edits per 10 mins)
const updateCooldowns = new Map();
const COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes cooldown per guild

/**
 * Debounced version of updateGuildStats to avoid rate limit bans.
 * @param {import("discord.js").Client} client The bot client.
 * @param {string} guildId The ID of the guild.
 */
async function updateGuildStatsDebounced(client, guildId) {
  const now = Date.now();
  const lastUpdate = updateCooldowns.get(guildId) || 0;

  if (now - lastUpdate < COOLDOWN_MS) {
    const timerKey = `${guildId}:timer`;
    if (!updateCooldowns.has(timerKey)) {
      const remaining = COOLDOWN_MS - (now - lastUpdate);
      const timer = setTimeout(() => {
        updateCooldowns.delete(timerKey);
        updateGuildStats(client, guildId);
      }, remaining);
      updateCooldowns.set(timerKey, timer);
    }
    return;
  }

  updateCooldowns.set(guildId, now);
  const timerKey = `${guildId}:timer`;
  const pendingTimer = updateCooldowns.get(timerKey);
  if (pendingTimer) {
    clearTimeout(pendingTimer);
    updateCooldowns.delete(timerKey);
  }

  await updateGuildStats(client, guildId);
}

/**
 * Updates all stats channels configured for a guild.
 * @param {import("discord.js").Client} client The bot client.
 * @param {string} guildId The ID of the guild.
 */
async function updateGuildStats(client, guildId) {
  try {
    const settings = await ServerStats.findOne({ guildId });
    if (!settings || !settings.isEnabled) return;

    const guild = client.guilds.cache.get(guildId) || await client.guilds.fetch(guildId).catch(() => null);
    if (!guild) return;

    // Fetch members to ensure caching is as accurate as possible
    const members = await guild.members.fetch().catch(() => guild.members.cache);

    const channelsToKeep = [];
    let modified = false;

    for (const chanConfig of (settings.channels || [])) {
      const channel = guild.channels.cache.get(chanConfig.channelId) || await guild.channels.fetch(chanConfig.channelId).catch(() => null);
      
      if (!channel) {
        // Channel was deleted, mark config for removal
        modified = true;
        continue;
      }

      channelsToKeep.push(chanConfig);

      const expectedName = parseTemplate(chanConfig.template, guild, members);
      if (channel.name !== expectedName) {
        try {
          await channel.setName(expectedName, "Live Server Stats Update");
        } catch (err) {
          client.logger?.log(`[Server Stats] Failed to update channel name for ${channel.id}: ${err.message}`, "error");
        }
      }
    }

    if (modified) {
      settings.channels = channelsToKeep;
      settings.markModified("channels");
      await settings.save();
    }
  } catch (err) {
    client.logger?.log(`[Server Stats] Error updating guild stats for ${guildId}: ${err.stack || err.message}`, "error");
  }
}

/**
 * Updates stats channels for all guilds.
 * @param {import("discord.js").Client} client The bot client.
 */
async function updateAllGuildStats(client) {
  try {
    const allSettings = await ServerStats.find({ isEnabled: true });
    for (const settings of allSettings) {
      await updateGuildStats(client, settings.guildId);
    }
  } catch (err) {
    client.logger?.log(`[Server Stats] Error in updateAllGuildStats: ${err.message}`, "error");
  }
}

/**
 * Starts the live server stats update interval loop.
 * @param {import("discord.js").Client} client The bot client.
 */
function startServerStatsInterval(client) {
  // Update stats on startup
  setTimeout(() => {
    updateAllGuildStats(client);
  }, 10000); // Wait 10 seconds after boot to let shards stabilize

  // Update every 10 minutes
  setInterval(() => {
    updateAllGuildStats(client);
  }, 600000);
}

module.exports = {
  parseTemplate,
  updateGuildStats,
  updateGuildStatsDebounced,
  updateAllGuildStats,
  startServerStatsInterval,
};
