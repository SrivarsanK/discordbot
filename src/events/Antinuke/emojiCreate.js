const { v2 } = require("../../utils/v2");
const { EmbedBuilder } = require("discord.js");
const AntiNuke = require("../../schema/antinuke");

module.exports = {
  name: "emojiCreate",
  run: async (client, emoji) => {
    try {
      const antiNukeSettings = await AntiNuke.findOne({
        guildId: emoji.guild.id,
      });
      if (!antiNukeSettings?.isEnabled) return;

      const { extraOwners, whitelistUsers, whitelistRoles, logChannelId } =
        antiNukeSettings;

      const auditLogs = await emoji.guild
        .fetchAuditLogs({
          limit: 1,
          type: 60, // Numeric type for EMOJI_CREATE
        })
        .catch(() => null);

      const logEntry = auditLogs?.entries?.first();
      if (!logEntry) return;

      const { executor } = logEntry;

      if (
        [emoji.guild.ownerId, client.user.id, ...extraOwners].includes(
          executor.id,
        )
      )
        return;

      const executorMember = await emoji.guild.members
        .fetch(executor.id)
        .catch(() => null);
      if (!executorMember) return;

      const isWhitelisted =
        whitelistUsers.includes(executor.id) ||
        executorMember.roles.cache.some((role) =>
          whitelistRoles.includes(role.id),
        );

      if (!isWhitelisted) {
        await emoji.delete().catch(() => null);
        await emoji.guild.members
          .ban(executor.id, { reason: "Unauthorized emoji creation" })
          .catch(() => null);

        // Log the action to the log channel
        if (logChannelId) {
          const logChannel = emoji.guild.channels.cache.get(logChannelId);
          if (logChannel) {
            const logEmbed = new EmbedBuilder()
               // Color for unauthorized action
              .setTitle("Unauthorized Emoji Creation")
              .setDescription(
                `An emoji was created by **${executor.tag}** (${executor.id}), but they were not authorized.`,
              )
              .addFields([
                {
                  name: "Executor",
                  value: `${executor.tag} (${executor.id})`,
                  inline: true,
                },
                { name: "Emoji", value: emoji.name, inline: true },
                { name: "Action", value: "Emoji deleted and executor banned." },
              ])
              .setTimestamp();

            await logChannel.send(v2({ embeds: [logEmbed] }));
          }
        }
      }
    } catch (err) {
      console.error("[ANTINUKE] Error in emojiCreate:", err);
    }
  },
};
