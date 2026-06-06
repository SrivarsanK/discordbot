const { v2 } = require("../../utils/v2");
const { EmbedBuilder } = require("discord.js");
const AntiNuke = require("../../schema/antinuke");

module.exports = {
  name: "webhookUpdate",
  run: async (client, channel) => {
    try {
      const guild = channel.guild;
      if (!guild) return;

      const antiNukeSettings = await AntiNuke.findOne({
        guildId: guild.id,
      });
      if (!antiNukeSettings || !antiNukeSettings.isEnabled) return;

      const { extraOwners, whitelistUsers, whitelistRoles, logChannelId } =
        antiNukeSettings;

      const auditLogs = await guild
        .fetchAuditLogs({
          limit: 1,
          type: 52,
        })
        .catch(() => null);

      const logEntry = auditLogs?.entries?.first();
      if (!logEntry) return;

      const { executor } = logEntry;
      const targetWebhook = logEntry.target;

      if (
        [guild.ownerId, client.user.id, ...extraOwners].includes(
          executor.id,
        )
      )
        return;

      const executorMember = await guild.members
        .fetch(executor.id)
        .catch(() => null);
      if (!executorMember) return;

      const isExecutorWhitelisted = whitelistUsers.includes(executor.id);
      const isExecutorRoleWhitelisted = executorMember.roles.cache.some(
        (role) => whitelistRoles.includes(role.id),
      );
      if (!isExecutorWhitelisted && !isExecutorRoleWhitelisted) {
        await guild.members
          .ban(executor.id, { reason: "Unauthorized webhook deletion" })
          .catch(() => null);
        if (logChannelId) {
          const logChannel = guild.channels.cache.get(logChannelId);
          if (logChannel) {
            const logEmbed = new EmbedBuilder()
               // Default to red if client.color is undefined
              .setTitle("Unauthorized Webhook Deletion")
              .setDescription(
                `A webhook was deleted by **${executor.tag}** (${executor.id}).`,
              )
              .addFields([
                {
                  name: "Executor",
                  value: `${executor.tag} (${executor.id})`,
                  inline: true,
                },
                { name: "Webhook Name", value: targetWebhook?.name || "Unknown", inline: true },
                {
                  name: "Action Taken",
                  value: "Executor banned.",
                  inline: false,
                },
              ])
              .setTimestamp();

            await logChannel.send(v2({ embeds: [logEmbed] }));
          }
        }
      }
    } catch (err) {
      console.error("[ANTINUKE] Error in webhookDelete:", err);
    }
  },
};
