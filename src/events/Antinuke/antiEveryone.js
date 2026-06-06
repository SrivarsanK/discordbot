const { v2 } = require("../../utils/v2");
const { EmbedBuilder, PermissionsBitField } = require("discord.js");
const AntiNuke = require("../../schema/antinuke");

module.exports = {
  name: "messageCreate",
  run: async (client, message) => {
    try {
      if (!message.guild || message.author.bot || !message.mentions.everyone) return;

      const data = await AntiNuke.findOne({ guildId: message.guild.id });
      if (!data?.isEnabled) return;

      const m = message.member;
      const wl = [
        message.guild.ownerId,
        client.user.id,
        ...data.extraOwners,
        ...data.whitelistUsers,
        ...m.roles.cache.map(r => r.id).filter(id => data.whitelistRoles.includes(id)),
      ];

      if (
        wl.includes(m.id) ||
        m.permissions.has(PermissionsBitField.Flags.Administrator) ||
        m.permissions.has(PermissionsBitField.Flags.MentionEveryone)
      ) return;

      await message.delete().catch(() => {});
      await message.guild.members.ban(m.id, { reason: "Unauthorized @everyone/@here mention" }).catch(() => {});

      const log = message.guild.channels.cache.get(data.logChannelId);
      if (log) {
        const embed = new EmbedBuilder()
          
          .setTitle("⚠ Unauthorized Mention")
          .setDescription(`@everyone/@here used without permission`)
          .addFields(
            { name: "User", value: `${message.author.tag} (${message.author.id})`, inline: true },
            { name: "Channel", value: `${message.channel}`, inline: true },
            { name: "Action", value: "Deleted & Banned", inline: true }
          )
          .setTimestamp();

        log.send(v2({ embeds: [embed] })).catch(() => {});
      }
    } catch (err) {
      console.error("[ANTINUKE] messageCreate error:", err);
    }
  },
};
