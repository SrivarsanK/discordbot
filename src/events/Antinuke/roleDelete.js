const { v2 } = require("../../utils/v2");
const AntiNuke = require("../../schema/antinuke");

module.exports = {
  name: "roleDelete",
  run: async (client, role) => {
    try {
      const antiNukeSettings = await AntiNuke.findOne({ guildId: role.guild.id });
      if (!antiNukeSettings || !antiNukeSettings.isEnabled) return;

      const { extraOwners = [], whitelistUsers = [], whitelistRoles = [], logChannelId } = antiNukeSettings;

      const auditLogs = await role.guild.fetchAuditLogs({ limit: 1, type: 32 }).catch(() => null);
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
        executorMember.roles.cache.some(r => whitelistRoles.includes(r.id));

      if (!isExecutorWhitelisted) {
        // Recreate the deleted role
        await role.guild.roles.create({
          name: role.name,
          color: role.color,
          hoist: role.hoist,
          permissions: role.permissions,
          mentionable: role.mentionable,
          position: role.position,
          reason: "Restoring role deleted without authorization"
        }).catch(() => null);

        // Ban the executor
        const target = role.guild.members.cache.get(executor.id);
        if (target) {
          await role.guild.members.ban(executor.id, {
            reason: "Unauthorized role deletion (AntiNuke)"
          }).catch(() => null);
        }

        // Log to configured log channel
        if (logChannelId) {
          const logChannel = role.guild.channels.cache.get(logChannelId);
          if (logChannel) {
            const logEmbed = new client.embed()
              .t("🚨 Unauthorized Role Deletion")
              .d(`A role was deleted without authorization.`)
              .addFields(
                { name: "Executor", value: `${executor.tag} (${executor.id})`, inline: true },
                { name: "Role", value: `${role.name} (${role.id})`, inline: true },
                { name: "Action Taken", value: "Role recreated and user banned.", inline: false }
              )
              .setTimestamp();

            await logChannel.send(v2({ embeds: [logEmbed] })).catch(() => null);
          }
        }
      }
    } catch (err) {
      // Optional: silently fail or handle errors via a Discord error log
    }
  },
};
