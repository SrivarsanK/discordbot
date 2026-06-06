const { v2 } = require("../../utils/v2");
const { EmbedBuilder } = require("discord.js");
const AntiNuke = require("../../schema/antinuke");

module.exports = {
  name: "channelDelete",

  run: async (client, channel) => {
    try {
      const antiNukeSettings = await AntiNuke.findOne({ guildId: channel.guild.id });
      if (!antiNukeSettings || !antiNukeSettings.isEnabled) return;

      const { extraOwners = [], whitelistUsers = [], whitelistRoles = [], logChannelId } = antiNukeSettings;

      const auditLogs = await channel.guild.fetchAuditLogs({ limit: 1, type: 12 }).catch(() => null);
      const logEntry = auditLogs?.entries?.first();
      if (!logEntry) return;

      const { executor, createdTimestamp } = logEntry;
      const timeDiff = Date.now() - createdTimestamp;
      if (timeDiff > 5000) return;

      if ([channel.guild.ownerId, client.user.id, ...extraOwners].includes(executor.id)) return;

      const executorMember = await channel.guild.members.fetch(executor.id).catch(() => null);
      if (!executorMember) return;

      const isWhitelisted =
        whitelistUsers.includes(executor.id) ||
        executorMember.roles.cache.some(role => whitelistRoles.includes(role.id));

      if (!isWhitelisted) {
        // Restore the deleted channel
        const clonedChannel = await channel.clone().catch(() => null);
        if (clonedChannel) {
          await clonedChannel.setPosition(channel.position).catch(() => null);
          if (channel.parentId) {
            await clonedChannel.setParent(channel.parentId).catch(() => null);
          }
        }

        // Ban the executor
        await channel.guild.members.ban(executor.id, {
          reason: "Unauthorized channel deletion (AntiNuke)"
        }).catch(() => null);

        // Log the action
        if (logChannelId) {
          const logChannel = channel.guild.channels.cache.get(logChannelId);
          if (logChannel) {
            const logEmbed = new EmbedBuilder()
              
              .setTitle("🚨 Unauthorized Channel Deletion")
              .setDescription(`A channel was deleted without authorization.`)
              .addFields(
                { name: "Executor", value: `${executor.tag} (${executor.id})`, inline: true },
                { name: "Channel", value: `#${channel.name} (${channel.id})`, inline: true },
                { name: "Action Taken", value: "Channel restored and executor banned.", inline: false }
              )
              .setTimestamp();

            await logChannel.send(v2({ embeds: [logEmbed] })).catch(() => null);
          }
        }
      }
    } catch (err) {
      // Optional: silently fail or send to a dedicated log channel
    }
  },
};
