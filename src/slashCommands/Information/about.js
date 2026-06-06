/** @format */

const { v2 } = require("../../utils/v2");

const { EmbedBuilder, version } = require("discord.js");
const { getFooterText } = require("../../utils/botMeta");

module.exports = {
  name: "about",
  description: "Know Me!",
  userPrams: [],
  botPrams: ["EMBED_LINKS"],
  owner: false,

  run: async (client, interaction) => {
    await interaction.deferReply({ ephemeral: false });

    const uptime = Math.round((Date.now() - interaction.client.uptime) / 1000);
    const userCount = client.guilds.cache.reduce(
      (acc, guild) => acc + guild.memberCount,
      0,
    );

    const embed = new EmbedBuilder()
      
      .setAuthor({
        name: `${client.user.username} Information`,
        iconURL: client.user.displayAvatarURL(),
      })
      .setDescription(
        `**Bot:** ${client.user.username}\n` +
          `**Servers:** ${client.guilds.cache.size}\n` +
          `**Users:** ${client.numb(userCount)}\n` +
          `**Commands:** ${client.commands.size}\n` +
          `**Discord.js:** v${version}\n` +
          `**Uptime:** <t:${uptime}:R>\n\n` +
          `Modified by SrivarsanK.`,
      )
      .setFooter({
        text: getFooterText(client),
        iconURL: client.user.displayAvatarURL(),
      });

    return interaction.editReply(v2({ embeds: [embed] }));
  },
};
