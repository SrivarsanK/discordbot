const { v2 } = require("../../utils/v2");
const {
  awardPremiumXp,
  formatLevelMessage,
  getPremiumSettings,
} = require("../../utils/premiumFeatures");

const cooldowns = new Map();

module.exports = {
  name: "messageCreate",
  run: async (client, message) => {
    if (message.author.bot || !message.guild) return;

    try {
      const settings = await getPremiumSettings(message.guild.id);
      const leveling = settings.leveling || {};
      if (!leveling.enabled || !leveling.chatEnabled) return;

      const key = `${message.guild.id}:${message.author.id}`;
      const now = Date.now();
      const cooldownMs = Math.max(5, leveling.chatCooldownSeconds || 45) * 1000;
      if ((cooldowns.get(key) || 0) > now) return;
      cooldowns.set(key, now + cooldownMs);

      const min = Math.max(1, leveling.chatXpMin || 8);
      const max = Math.max(min, leveling.chatXpMax || 16);
      const amount = randomInt(min, max);
      const result = await awardPremiumXp(message.guild.id, message.author.id, "chat", amount);
      if (!result?.levelUp) return;

      const channel =
        message.guild.channels.cache.get(leveling.announceChannelId) ||
        message.channel;
      await channel
        ?.send(
          v2(
            formatLevelMessage(
              leveling.levelUpMessage,
              message.member,
              result.level,
              message.guild,
            ),
          ),
        )
        .catch(() => null);
    } catch (error) {
      client.logger?.log(`[Leveling] Chat XP failed: ${error.stack || error}`, "error");
    }
  },
};

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
