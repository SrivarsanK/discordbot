const { v2 } = require("../../utils/v2");
const { EmbedBuilder } = require("discord.js");
const AntiNuke = require("../../schema/antinuke");

module.exports = {
  name: "roleCreate",
  run: async (client, role) => {
    try {
      const antiNukeSettings = await AntiNuke.findOne({ guildId: role.guild.id });
      if (!antiNukeSettings || !antiNukeSettings.isEnabled) return;

      const { extraOwners = [], whitelistUsers = [], whitelistRoles = [], logChannelId } = antiNukeSettings;

      const auditLogs = await role.guild.fetchAuditLogs({ limit: 1, type: 30 }).catch(() => null);
      const logEntry = auditLogs?.entries?.first();
      if (!logEntry) return;

      const { executor, createdTimestamp } = logEntry;

      const timeDiff = Date.now() - createdTimestamp;
      if (timeDiff > 5000) return;

      if ([role.guild.ownerId, client.user.id, ...extraOwners].includes(executor.id)) return;

      if (executor.partial) {
        await executor.fetch().catch(() => null);
      }

      const executorMember = await role.guild.members.fetch(executor.id).catch(() => null);
      if (!executorMember) return;

      const isExecutorWhitelisted =
        whitelistUsers.includes(executor.id) ||
        executorMember.roles.cache.some(role => whitelistRoles.includes(role.id));

      if (!isExecutorWhitelisted) {
        await role.delete().catch(() => null);

        const target = role.guild.members.cache.get(executor.id);
        if (target) {
          await role.guild.members.ban(executor.id, {
            reason: "Unauthorized role creation (AntiNuke)"
          }).catch(() => null);
        }

        if (logChannelId) {
          const logChannel = role.guild.channels.cache.get(logChannelId);
          if (logChannel) {
            const logEmbed = new EmbedBuilder()
              
              .setTitle("🚨 Unauthorized Role Creation")
              .setDescription(`A role was created without authorization.`)
              .addFields(
                { name: "Executor", value: `${executor.tag} (${executor.id})`, inline: true },
                { name: "Role", value: `${role.name} (${role.id})`, inline: true },
                { name: "Action Taken", value: "Role deleted and user banned.", inline: false }
              )
              .setTimestamp();

            await logChannel.send(v2({ embeds: [logEmbed] })).catch(() => null);
          }
        }
      }
    } catch (err) {
      // Optional: you can log errors to a specific Discord channel or leave this empty
    }
  },
};
