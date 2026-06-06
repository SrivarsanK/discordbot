const { v2 } = require("../../utils/v2");
const { EmbedBuilder } = require("discord.js");
const AntiNuke = require("../../schema/antinuke");

module.exports = {
  name: "emojiUpdate",
  run: async (client, oldEmoji, newEmoji) => {
    try {
      const antiNukeSettings = await AntiNuke.findOne({
        guildId: oldEmoji.guild.id,
      });
      if (!antiNukeSettings?.isEnabled) return;
      const { extraOwners, whitelistUsers, whitelistRoles, logChannelId } =
        antiNukeSettings;
      const auditLogs = await oldEmoji.guild
        .fetchAuditLogs({
          limit: 1,
          type: 61,
        })
        .catch(() => null);

      const logEntry = auditLogs?.entries?.first();
      if (!logEntry) return;
      const { executor } = logEntry;
      if (
        [oldEmoji.guild.ownerId, client.user.id, ...extraOwners].includes(
          executor.id,
        )
      )
        return;

      const executorMember = await oldEmoji.guild.members
        .fetch(executor.id)
        .catch(() => null);
      if (!executorMember) return;

      const isWhitelisted =
        whitelistUsers.includes(executor.id) ||
        executorMember.roles.cache.some((role) =>
          whitelistRoles.includes(role.id),
        );

      if (!isWhitelisted) {
        await oldEmoji.guild.members
          .ban(executor.id, { reason: "Unauthorized emoji update" })
          .catch(() => null);
        if (logChannelId) {
          const logChannel = oldEmoji.guild.channels.cache.get(logChannelId);
          if (logChannel) {
            const logEmbed = new EmbedBuilder()
              
              .setTitle("Unauthorized Emoji Update")
              .setDescription(
                `An emoji was updated by **${executor.tag}** (${executor.id}).`,
              )
              .addFields([
                {
                  name: "Executor",
                  value: `${executor.tag} (${executor.id})`,
                  inline: true,
                },
                {
                  name: "Old Emoji Name",
                  value: oldEmoji.name || "Unknown",
                  inline: true,
                },
                {
                  name: "New Emoji Name",
                  value: newEmoji.name || "Unknown",
                  inline: true,
                },
                {
                  name: "Action Taken",
                  value: "Executor banned.",
                  inline: true,
                },
              ])
              .setThumbnail(newEmoji.url || null)
              .setTimestamp();

            await logChannel.send(v2({ embeds: [logEmbed] }));
          }
        }
      }
    } catch (err) {
      console.error("[ANTINUKE] Error in emojiUpdate:", err);
    }
  },
};
