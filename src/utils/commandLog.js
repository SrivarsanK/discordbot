/** @format */
/**
 * sendCommandLog — sends command execution embed to the guild's configured
 * log channel (antinuke.logChannelId). Falls back to the legacy webhook URL
 * in client.config.Webhooks.cmdrun only if no channel is set in the DB.
 */
const { sendWebhook } = require("./webhook");
const AntiNuke = require("../schema/antinuke");

/**
 * @param {import("discord.js").Client} client
 * @param {import("discord.js").Guild|null} guild
 * @param {import("discord.js").EmbedBuilder} embed
 */
async function sendCommandLog(client, guild, embed) {
  if (!guild) return;

  try {
    // Prefer the channel set in the dashboard
    const data = await AntiNuke.findOne({ guildId: guild.id });
    const logChannelId = data?.logChannelId;

    if (logChannelId) {
      const channel = guild.channels.cache.get(logChannelId);
      if (channel) {
        return channel.send({ embeds: [embed] }).catch(() => {});
      }
    }

    // Fallback: legacy webhook URL from config
    const webhookUrl = client.config?.Webhooks?.cmdrun;
    if (webhookUrl) {
      sendWebhook(client, webhookUrl, { embeds: [embed] }, "command log");
    }
  } catch (err) {
    client.logger?.log(`[CommandLog] Failed: ${err.message}`, "warn");
  }
}

module.exports = { sendCommandLog };
