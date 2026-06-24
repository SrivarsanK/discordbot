/** @format */
const ServerStats = require("../schema/serverstats");
const { ChannelType } = require("discord.js");

/**
 * Replaces placeholders in a template string with actual guild stats.
 * @param {string} template The template pattern.
 * @param {import("discord.js").Guild} guild The guild object.
 * @returns {string} The formatted channel name.
 */
function parseTemplate(template, guild) {
  const total = guild.memberCount || 0;
  const bots = guild.members.cache.filter((m) => m.user.bot).size || 0;
  const humans = Math.max(0, total - bots);
  
  // Calculate online members from presence cache
  const online = guild.members.cache.filter((m) => m.presence && m.presence.status !== "offline").size || 0;
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

    // Fetch members to ensure presence caching is as accurate as possible
    await guild.members.fetch().catch(() => {});

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

      const expectedName = parseTemplate(chanConfig.template, guild);
      if (channel.name !== expectedName) {
        try {
          await channel.setName(expectedName, "Live Server Stats Update");
        } catch (err) {
          client.logger.log(`[Server Stats] Failed to update channel name for ${channel.id}: ${err.message}`, "error");
        }
      }
    }

    if (modified) {
      settings.channels = channelsToKeep;
      settings.markModified("channels");
      await settings.save();
    }
  } catch (err) {
    client.logger.log(`[Server Stats] Error updating guild stats for ${guildId}: ${err.stack || err.message}`, "error");
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
    client.logger.log(`[Server Stats] Error in updateAllGuildStats: ${err.message}`, "error");
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

  // Update every 10 minutes (Discord channel rename rate limit is 2 edits per 10 minutes)
  setInterval(() => {
    updateAllGuildStats(client);
  }, 600000);
}

module.exports = {
  parseTemplate,
  updateGuildStats,
  updateAllGuildStats,
  startServerStatsInterval,
};
