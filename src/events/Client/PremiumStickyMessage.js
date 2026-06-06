const { v2 } = require("../../utils/v2");
const {
  clearPremiumSettingsCache,
  getPremiumSettings,
} = require("../../utils/premiumFeatures");

const cooldowns = new Map();

module.exports = {
  name: "messageCreate",
  run: async (client, message) => {
    if (message.author.bot || !message.guild) return;

    try {
      const settings = await getPremiumSettings(message.guild.id);
      const sticky = settings.sticky || {};
      if (!sticky.enabled) return;

      const item = (sticky.messages || []).find(
        (entry) => entry.channelId === message.channel.id && entry.content,
      );
      if (!item) return;

      const key = `${message.guild.id}:${message.channel.id}`;
      const now = Date.now();
      const cooldownMs = Math.max(5, item.cooldownSeconds || 20) * 1000;
      if ((cooldowns.get(key) || 0) > now) return;
      cooldowns.set(key, now + cooldownMs);

      setTimeout(() => repostSticky(client, message, item).catch(() => null), 1200);
    } catch (error) {
      client.logger?.log(`[Sticky] Failed: ${error.stack || error}`, "error");
    }
  },
};

async function repostSticky(client, message, item) {
  if (item.lastMessageId) {
    const oldMessage = await message.channel.messages.fetch(item.lastMessageId).catch(() => null);
    await oldMessage?.delete().catch(() => null);
  }

  const sent = await message.channel.send(v2(item.content)).catch(() => null);
  if (!sent) return;

  const settings = await getPremiumSettings(message.guild.id);
  const target = settings.sticky.messages.find((entry) => entry.channelId === item.channelId);
  if (!target) return;

  target.lastMessageId = sent.id;
  await settings.save();
  clearPremiumSettingsCache(message.guild.id);
}
