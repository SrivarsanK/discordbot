const { v2 } = require("../../utils/v2");
const { EmbedBuilder } = require("discord.js");
const AntiNuke = require("../../schema/antinuke");

module.exports = {
  name: "emojiDelete",
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
          type: 62, // Numeric type for EMOJI_DELETE
        })
        .catch(() => null);

      const logEntry = auditLogs?.entries?.first();
      if (!logEntry) return;

      const { executor } = logEntry;

      // Skip if the executor is the guild owner, the bot itself, or an extra owner
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
        // Ban the executor for unauthorized emoji deletion
        await emoji.guild.members
          .ban(executor.id, { reason: "Unauthorized emoji deletion" })
          .catch(() => null);

        // Send a log message to the specified log channel
        if (logChannelId) {
          const logChannel = emoji.guild.channels.cache.get(logChannelId);
          if (logChannel) {
            const logEmbed = new EmbedBuilder()
               // Red color for unauthorized actions
              .setTitle("Unauthorized Emoji Deletion")
              .setDescription(
                `An emoji was deleted by **${executor.tag}** (${executor.id}).`,
              )
              .addFields([
                {
                  name: "Executor",
                  value: `${executor.tag} (${executor.id})`,
                  inline: true,
                },
                {
                  name: "Emoji Deleted",
                  value: emoji.name || "Unknown",
                  inline: true,
                },
                {
                  name: "Action Taken",
                  value: "Executor banned.",
                  inline: true,
                },
              ])
              .setThumbnail(emoji.url || null) // Show emoji image if available
              .setTimestamp();

            await logChannel.send(v2({ embeds: [logEmbed] }));
          }
        }
      }
    } catch (err) {
      console.error("[ANTINUKE] Error in emojiDelete:", err);
    }
  },
};
