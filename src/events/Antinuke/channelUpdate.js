const { v2 } = require("../../utils/v2");
const { EmbedBuilder, ChannelType } = require("discord.js");
const AntiNuke = require("../../schema/antinuke");

module.exports = {
  name: "channelUpdate",
  run: async (client, oldChannel, newChannel) => {
    try {
      const antiNukeSettings = await AntiNuke.findOne({ guildId: oldChannel.guild.id });
      if (!antiNukeSettings?.isEnabled) return;

      const { extraOwners = [], whitelistUsers = [], whitelistRoles = [], logChannelId } = antiNukeSettings;

      const auditLogs = await oldChannel.guild
        .fetchAuditLogs({ limit: 1, type: 11 }) // 11 = CHANNEL_UPDATE
        .catch(() => null);

      const logEntry = auditLogs?.entries?.first();
      if (!logEntry) return;

      const { executor, createdTimestamp } = logEntry;
      const timeDiff = Date.now() - createdTimestamp;
      if (timeDiff > 5000) return; // Ignore stale logs

      if (
        executor.id === oldChannel.guild.ownerId ||
        executor.id === client.user.id ||
        extraOwners.includes(executor.id)
      ) return;

      const executorMember = await oldChannel.guild.members.fetch(executor.id).catch(() => null);
      if (!executorMember) return;

      const isWhitelisted =
        whitelistUsers.includes(executor.id) ||
        executorMember.roles.cache.some((r) => whitelistRoles.includes(r.id));

      if (!isWhitelisted) {
        await oldChannel.guild.members
          .ban(executor.id, { reason: "Unauthorized channel update" })
          .catch(() => null);

        // Revert channel name change
        if (oldChannel.name !== newChannel.name) {
          await newChannel.edit(v2({ name: oldChannel.name })).catch(() => null);
        }

        // Revert topic (if applicable)
        if (
          newChannel.type === ChannelType.GuildText ||
          newChannel.type === ChannelType.GuildAnnouncement
        ) {
          if (oldChannel.topic !== newChannel.topic) {
            await newChannel.setTopic(oldChannel.topic).catch(() => null);
          }
        }

        // Log the action
        if (logChannelId) {
          const logChannel = oldChannel.guild.channels.cache.get(logChannelId);
          if (logChannel) {
            const logEmbed = new EmbedBuilder()
              
              .setTitle("Unauthorized Channel Update")
              .setDescription(`Channel updated by **${executor.tag}** (${executor.id}) without authorization.`)
              .addFields(
                { name: "Executor", value: `${executor.tag} (${executor.id})`, inline: true },
                { name: "Channel", value: `${oldChannel.name} (${oldChannel.id})`, inline: true },
                { name: "Action Taken", value: "Executor banned, changes reverted." }
              )
              .setTimestamp();

            await logChannel.send(v2({ embeds: [logEmbed] })).catch(() => null);
          }
        }
      }
    } catch (err) {
      // Silent catch or internal log system
    }
  },
};
