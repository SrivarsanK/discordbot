const { v2 } = require("../../utils/v2");
const { EmbedBuilder } = require("discord.js");
const AntiNuke = require("../../schema/antinuke");

module.exports = {
  name: "stickerDelete",
  run: async (client, sticker) => {
    try {
      const antiNukeSettings = await AntiNuke.findOne({
        guildId: sticker.guild.id,
      });
      if (!antiNukeSettings || !antiNukeSettings.isEnabled) return;

      const { extraOwners, whitelistUsers, whitelistRoles, logChannelId } =
        antiNukeSettings;

      const auditLogs = await sticker.guild
        .fetchAuditLogs({
          limit: 1,
          type: 21, // Numeric type for STICKER_DELETE
        })
        .catch(() => null);

      const logEntry = auditLogs?.entries?.first();
      if (!logEntry) return;

      const { executor } = logEntry;

      if (
        [sticker.guild.ownerId, client.user.id, ...extraOwners].includes(
          executor.id,
        )
      )
        return;

      const executorMember = await sticker.guild.members
        .fetch(executor.id)
        .catch(() => null);
      if (!executorMember) return;

      const isWhitelisted =
        whitelistUsers.includes(executor.id) ||
        executorMember.roles.cache.some((role) =>
          whitelistRoles.includes(role.id),
        );

      if (!isWhitelisted) {
        await sticker.guild.members
          .ban(executor.id, { reason: "Unauthorized sticker deletion" })
          .catch(() => null);
        console.log(
          `[ANTINUKE] Banned ${executor.tag} for unauthorized sticker deletion.`,
        );

        // Log to the designated log channel if specified
        if (logChannelId) {
          const logChannel = sticker.guild.channels.cache.get(logChannelId);
          if (logChannel) {
            const logEmbed = new EmbedBuilder()
               // Default to red if client.color is undefined
              .setTitle("Unauthorized Sticker Deletion")
              .setDescription(
                `A sticker was deleted by **${executor.tag}** (${executor.id}).`,
              )
              .addFields([
                {
                  name: "Executor",
                  value: `${executor.tag} (${executor.id})`,
                  inline: true,
                },
                {
                  name: "Sticker Name",
                  value: `${sticker.name} (${sticker.id})`,
                  inline: true,
                },
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
      console.error("[ANTINUKE] Error in stickerDelete:", err);
    }
  },
};
