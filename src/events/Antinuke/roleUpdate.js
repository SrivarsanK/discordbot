const { v2 } = require("../../utils/v2");
const { EmbedBuilder } = require("discord.js");
const AntiNuke = require("../../schema/antinuke");

module.exports = {
  name: "roleUpdate",
  run: async (client, oldRole, newRole) => {
    try {
      const antiNukeSettings = await AntiNuke.findOne({
        guildId: oldRole.guild.id,
      });
      if (!antiNukeSettings?.isEnabled) return;

      const { extraOwners, whitelistUsers, whitelistRoles, logChannelId } = antiNukeSettings;

      const auditLogs = await oldRole.guild
        .fetchAuditLogs({
          limit: 1,
          type: 31, // ROLE_UPDATE
        })
        .catch(() => null);
      const logEntry = auditLogs?.entries?.first();
      if (!logEntry) return;

      const { executor } = logEntry;

      if (
        executor.id === oldRole.guild.ownerId ||
        executor.id === client.user.id ||
        extraOwners.includes(executor.id)
      ) return;

      const executorMember = await oldRole.guild.members
        .fetch(executor.id)
        .catch(() => null);
      if (!executorMember) return;

      const isWhitelisted =
        whitelistUsers.includes(executor.id) ||
        executorMember.roles.cache.some((r) => whitelistRoles.includes(r.id));

      if (!isWhitelisted) {
        const oldName = oldRole.name;
        const newName = newRole.name;

        try {
          await newRole.guild.members.ban(executor.id, {
            reason: "Unauthorized role update",
          }).catch(() => null);

          if (oldName !== newName) {
            await newRole.edit(v2({
              name: oldName,
            })).catch(() => null);
          }
        } catch (_) {}

        if (logChannelId) {
          const logChannel = newRole.guild.channels.cache.get(logChannelId);
          if (logChannel) {
            const logEmbed = new EmbedBuilder()
              
              .setTitle("Unauthorized Role Update")
              .setDescription(
                `A role was updated by **${executor.tag}** (${executor.id}), but they were not authorized.`,
              )
              .addFields([
                {
                  name: "Executor",
                  value: `${executor.tag} (${executor.id})`,
                  inline: true,
                },
                {
                  name: "Role",
                  value: `${oldRole.name} (${oldRole.id})`,
                  inline: true,
                },
                {
                  name: "Action",
                  value: "Executor banned and role restored if changed.",
                },
              ])
              .setTimestamp();

            await logChannel.send(v2({ embeds: [logEmbed] }));
          }
        }
      }
    } catch (err) {
      // optional: you can still log errors to a file or logging service if needed
    }
  },
};
