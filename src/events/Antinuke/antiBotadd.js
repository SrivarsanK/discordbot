const { v2 } = require("../../utils/v2");
const { EmbedBuilder } = require("discord.js");
const AntiNuke = require("../../schema/antinuke");

module.exports = {
  name: "guildMemberAdd",
  run: async (client, member) => {
    try {
      if (!member.user.bot) return;

      const data = await AntiNuke.findOne({ guildId: member.guild.id }).catch(() => null);
      if (!data?.isEnabled) return;

      const { extraOwners, whitelistUsers, whitelistRoles, logChannelId } = data;
      const logs = await member.guild.fetchAuditLogs({ type: 28, limit: 1 }).catch(() => null);
      const entry = logs?.entries.first();
      const executor = entry?.executor;
      if (!executor) return;

      if ([member.guild.ownerId, client.user.id, ...extraOwners].includes(executor.id)) return;

      const exMember = await member.guild.members.fetch(executor.id).catch(() => null);
      if (!exMember) return;

      const isWL =
        whitelistUsers.includes(executor.id) ||
        exMember.roles.cache.some(r => whitelistRoles.includes(r.id));

      const channel = logChannelId && member.guild.channels.cache.get(logChannelId);
      if (!channel?.send) return;

      const embed = new EmbedBuilder()
        
        .setTitle(isWL ? "Whitelisted Bot Addition" : "Unauthorized Bot Addition")
        .setDescription(
          `**${executor.tag}** (${executor.id}) added **${member.user.tag}** (${member.user.id})` +
          (isWL ? `\n\n> No action taken (User is whitelisted).` : `\n\n> Bot kicked, executor banned.`)
        )
        .setTimestamp();

      if (!isWL) {
        await member.kick("Unauthorized bot addition").catch(() => null);
        await member.guild.members.ban(executor.id, { reason: "Unauthorized bot addition" }).catch(() => null);
      }

      await channel.send(v2({ embeds: [embed] })).catch(() => null);
    } catch (err) {
      console.error("[ANTINUKE] guildMemberAdd error:", err);
    }
  },
};
