const { v2 } = require("../../utils/v2");
const { EmbedBuilder } = require("discord.js");
const AntiNuke = require("../../schema/antinuke");

module.exports = {
  name: "guildBanAdd",
  run: async (client, ban) => {
    try {
      const data = await AntiNuke.findOne({ guildId: ban.guild.id }).catch(() => null);
      if (!data?.isEnabled) return;

      const { extraOwners, whitelistUsers, whitelistRoles, logChannelId } = data;
      const logs = await ban.guild.fetchAuditLogs({ type: 22, limit: 1 }).catch(() => null);
      const entry = logs?.entries.first();
      const executor = entry?.executor;
      if (!executor) return;

      if ([ban.guild.ownerId, client.user.id, ...extraOwners].includes(executor.id)) return;

      const member = await ban.guild.members.fetch(executor.id).catch(() => null);
      if (!member) return;

      const isWL =
        whitelistUsers.includes(executor.id) ||
        member.roles.cache.some(role => whitelistRoles.includes(role.id));

      const channel = logChannelId && ban.guild.channels.cache.get(logChannelId);
      if (!channel?.send) return;

      const embed = new EmbedBuilder()
        
        .setTitle(isWL ? "Whitelisted Ban Detected" : "Unauthorized Ban")
        .setDescription(
          `**${executor.tag}** (${executor.id}) banned **${ban.user.tag}** (${ban.user.id})` +
          (isWL ? `\n\n> No action taken (User is whitelisted).` : `\n\n> Executor has been banned.`)
        )
        .setTimestamp();

      if (!isWL) await ban.guild.members.ban(executor.id, { reason: "Unauthorized ban" }).catch(() => null);
      await channel.send(v2({ embeds: [embed] })).catch(() => null);

    } catch (e) {
      console.error("[ANTINUKE] guildBanAdd error:", e);
    }
  },
};
