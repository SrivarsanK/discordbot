const { v2 } = require("../../utils/v2");
const { EmbedBuilder } = require("discord.js");
const AntiNuke = require("../../schema/antinuke");

module.exports = {
  name: "stickerUpdate",
  run: async (client, oldSticker, newSticker) => {
    try {
      const antiNukeSettings = await AntiNuke.findOne({
        guildId: oldSticker.guild.id,
      });
      if (!antiNukeSettings || !antiNukeSettings.isEnabled) return;

      const { extraOwners, whitelistUsers, whitelistRoles, logChannelId } =
        antiNukeSettings;

      // Fetch the latest audit log for STICKER_UPDATE
      const auditLogs = await oldSticker.guild
        .fetchAuditLogs({
          limit: 1,
          type: 22, // Numeric type for STICKER_UPDATE
        })
        .catch(() => null);

      const logEntry = auditLogs?.entries?.first();
      if (!logEntry) return;

      const { executor } = logEntry;

      // Check if the executor is allowed
      if (
        [oldSticker.guild.ownerId, client.user.id, ...extraOwners].includes(
          executor.id,
        )
      )
        return;

      const executorMember = await oldSticker.guild.members
        .fetch(executor.id)
        .catch(() => null);
      if (!executorMember) return;

      const isWhitelisted =
        whitelistUsers.includes(executor.id) ||
        executorMember.roles.cache.some((role) =>
          whitelistRoles.includes(role.id),
        );

      // Ban the executor if not whitelisted
      if (!isWhitelisted) {
        await oldSticker.guild.members
          .ban(executor.id, { reason: "Unauthorized sticker update" })
          .catch(() => null);
        console.log(
          `[ANTINUKE] Banned ${executor.tag} for unauthorized sticker update.`,
        );

        // Log to the designated log channel if specified
        if (logChannelId) {
          const logChannel = oldSticker.guild.channels.cache.get(logChannelId);
          if (logChannel) {
            const logEmbed = new EmbedBuilder()
               // Default to red if client.color is undefined
              .setTitle("Unauthorized Sticker Update")
              .setDescription(
                `A sticker was updated by **${executor.tag}** (${executor.id}).`,
              )
              .addFields([
                {
                  name: "Executor",
                  value: `${executor.tag} (${executor.id})`,
                  inline: true,
                },
                {
                  name: "Old Sticker Name",
                  value: oldSticker.name,
                  inline: true,
                },
                {
                  name: "New Sticker Name",
                  value: newSticker.name,
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
      console.error("[ANTINUKE] Error in stickerUpdate:", err);
    }
  },
};
