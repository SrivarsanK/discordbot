const { v2 } = require("../../utils/v2");
const {
  awardPremiumXp,
  formatLevelMessage,
  getPremiumSettings,
} = require("../../utils/premiumFeatures");

const voiceSessions = new Map();

module.exports = {
  name: "voiceStateUpdate",
  run: async (client, oldState, newState) => {
    const member = newState.member || oldState.member;
    const guild = newState.guild || oldState.guild;
    if (!member || member.user?.bot || !guild) return;

    const key = `${guild.id}:${member.id}`;
    const oldChannelId = oldState.channelId;
    const newChannelId = newState.channelId;
    if (oldChannelId === newChannelId) return;

    try {
      if (oldChannelId) {
        await settleVoiceSession(client, guild, member, key);
      }

      if (newChannelId) {
        voiceSessions.set(key, Date.now());
      } else {
        voiceSessions.delete(key);
      }
    } catch (error) {
      client.logger?.log(`[Leveling] Voice XP failed: ${error.stack || error}`, "error");
    }
  },
};

async function settleVoiceSession(client, guild, member, key) {
  const startedAt = voiceSessions.get(key);
  voiceSessions.delete(key);
  if (!startedAt) return;

  const settings = await getPremiumSettings(guild.id);
  const leveling = settings.leveling || {};
  if (!leveling.enabled || !leveling.voiceEnabled) return;

  const minutes = Math.floor((Date.now() - startedAt) / 60000);
  if (minutes < 1) return;

  const amount = minutes * Math.max(1, leveling.voiceXpPerMinute || 4);
  const result = await awardPremiumXp(guild.id, member.id, "voice", amount);
  if (!result?.levelUp) return;

  const channel =
    guild.channels.cache.get(leveling.announceChannelId) ||
    guild.systemChannel ||
    guild.channels.cache.find((item) => item.isTextBased?.());
  await channel
    ?.send(v2(formatLevelMessage(leveling.levelUpMessage, member, result.level, guild)))
    .catch(() => null);
}
