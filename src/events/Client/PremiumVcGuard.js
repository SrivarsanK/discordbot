const { PermissionsBitField } = require("discord.js");
const { v2 } = require("../../utils/v2");
const { getPremiumSettings } = require("../../utils/premiumFeatures");

module.exports = {
  name: "voiceStateUpdate",
  run: async (client, oldState, newState) => {
    if (!newState.channelId || oldState.channelId === newState.channelId) return;

    const member = newState.member;
    const guild = newState.guild;
    if (!member || member.user?.bot || !guild) return;

    try {
      const settings = await getPremiumSettings(guild.id);
      const guard = settings.vcGuard || {};
      if (!guard.enabled || !guard.protectedChannels?.includes(newState.channelId)) return;
      if (canBypass(member, guard.bypassRoles || [])) return;

      await member.voice.disconnect("VC Guard").catch(() => null);
      await member.send(v2(guard.message)).catch(() => null);

      const logChannel = guild.channels.cache.get(guard.logChannelId);
      await logChannel
        ?.send(
          v2(
            `**VC Guard blocked a join**\n` +
              `> User: <@${member.id}>\n` +
              `> Channel: <#${newState.channelId}>`,
          ),
        )
        .catch(() => null);
    } catch (error) {
      client.logger?.log(`[VcGuard] Failed: ${error.stack || error}`, "error");
    }
  },
};

function canBypass(member, bypassRoles) {
  if (member.id === member.guild.ownerId) return true;
  if (
    member.permissions.has(PermissionsBitField.Flags.Administrator) ||
    member.permissions.has(PermissionsBitField.Flags.ManageChannels)
  ) {
    return true;
  }

  return member.roles.cache.some((role) => bypassRoles.includes(role.id));
}
