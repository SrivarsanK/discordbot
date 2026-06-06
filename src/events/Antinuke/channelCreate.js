const { v2 } = require("../../utils/v2");
const { EmbedBuilder } = require("discord.js");

const AntiNuke = require("../../schema/antinuke");

module.exports = {
  name: "channelCreate",
  run: async (client, channel) => {
    try {
      const antiNukeSettings = await AntiNuke.findOne({
        guildId: channel.guild.id,
      });
      if (!antiNukeSettings?.isEnabled) return;

      const { extraOwners, whitelistUsers, whitelistRoles, logChannelId } =
        antiNukeSettings;

      // Fetch the latest audit log for CHANNEL_CREATE
      const auditLogs = await channel.guild
        .fetchAuditLogs({ type: 10, limit: 1 })
        .catch(() => null);
      const logEntry = auditLogs?.entries?.first();
      if (!logEntry) return;

      const { executor } = logEntry;

      // Skip if the executor is the guild owner, the bot itself, or an extra owner
      if (
        executor.id === channel.guild.ownerId ||
        executor.id === client.user.id ||
        extraOwners.includes(executor.id)
      )
        return;

      // Check if the executor is whitelisted
      const executorMember = await channel.guild.members
        .fetch(executor.id)
        .catch(() => null);
      if (!executorMember) return;

      const isWhitelisted =
        whitelistUsers.includes(executor.id) ||
        executorMember.roles.cache.some((role) =>
          whitelistRoles.includes(role.id),
        );

      if (!isWhitelisted) {
        // Ban the executor and delete the channel concurrently
        await Promise.allSettled([
          channel.guild.members.ban(executor.id, {
            reason: "Unauthorized channel creation",
          }),
          channel.delete().catch(() => null),
        ]);

        // Check if logChannelId exists in the configuration
        if (logChannelId) {
          const logChannel = channel.guild.channels.cache.get(logChannelId);
          if (logChannel) {
            const logEmbed = new EmbedBuilder()
              
              .setTitle("Unauthorized Channel Creation")
              .setDescription(
                `A channel was created by **${executor.tag}** (${executor.id}), but they were not authorized.`,
              )
              .addFields([
                {
                  name: "Executor",
                  value: `${executor.tag} (${executor.id})`,
                  inline: true,
                },
                { name: "Channel", value: channel.name, inline: true },
                {
                  name: "Action",
                  value: "Channel deleted and executor banned.",
                },
              ])
              .setTimestamp();

            await logChannel.send(v2({ embeds: [logEmbed] }));
          }
        }
      }
    } catch (err) {
      console.error("[ANTINUKE] Error in channelCreate:", err);
    }
  },
};
