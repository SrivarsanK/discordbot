const { v2 } = require("../../utils/v2");
const { EmbedBuilder } = require("discord.js");
const AntiNuke = require("../../schema/antinuke");

module.exports = {
  name: "guildMemberUpdate",
  run: async (client, oldMember, newMember) => {
    try {
      const antiNukeSettings = await AntiNuke.findOne({
        guildId: oldMember.guild.id,
      });
      if (!antiNukeSettings || !antiNukeSettings.isEnabled) return;

      const { extraOwners, whitelistUsers, whitelistRoles, logChannelId } =
        antiNukeSettings;

      const auditLogs = await oldMember.guild
        .fetchAuditLogs({
          limit: 1,
          type: 25, // Numeric type for MEMBER_UPDATE
        })
        .catch(() => null);

      const logEntry = auditLogs?.entries?.first();
      if (!logEntry) return;

      const { executor, target } = logEntry;
      const targetUser = target?.user || target;

      // Ignore if the executor is the guild owner, bot itself, or an extra owner
      if (
        [oldMember.guild.ownerId, client.user.id, ...extraOwners].includes(
          executor.id,
        )
      )
        return;

      // Fetch the executor member
      const executorMember = await oldMember.guild.members
        .fetch(executor.id)
        .catch(() => null);
      if (!executorMember) return;
      const isExecutorWhitelisted =
        whitelistUsers.includes(executor.id) ||
        executorMember.roles.cache.some((role) =>
          whitelistRoles.includes(role.id),
        );

      if (!isExecutorWhitelisted) {
        await oldMember.guild.members
          .ban(executor.id, { reason: "Unauthorized member update" })
          .catch(() => null);
        if (logChannelId) {
          const logChannel = oldMember.guild.channels.cache.get(logChannelId);
          if (logChannel) {
            const logEmbed = new EmbedBuilder()
              
              .setTitle("Unauthorized Member Update")
              .setDescription(
                `A member update was performed by **${executor.tag}** (${executor.id}).`,
              )
              .addFields([
                {
                  name: "Executor",
                  value: `${executor.tag} (${executor.id})`,
                  inline: true,
                },
                {
                  name: "Target",
                  value: `${targetUser?.tag || "Unknown"} (${targetUser?.id || "Unknown"})`,
                  inline: true,
                },
                {
                  name: "Action Taken",
                  value: "Executor banned.",
                  inline: true,
                },
              ])
              .setThumbnail(targetUser?.displayAvatarURL?.({ dynamic: true }) || null)
              .setTimestamp();

            await logChannel.send(v2({ embeds: [logEmbed] }));
          }
        }
      }
    } catch (err) {
      console.error("[ANTINUKE] Error in memberUpdate:", err);
    }
  },
};
