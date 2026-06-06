const { v2 } = require("../../utils/v2");
const {
  EmbedBuilder,
  MessageFlags,
  ButtonBuilder,
  ActionRowBuilder,
  ButtonStyle,
  version,
} = require("discord.js");
const { getFooterText } = require("../../utils/botMeta");

module.exports = {
  name: "stats",
  description: "Get The Bot Invite Link",
  userPrams: [],
  botPrams: ["EMBED_LINKS"],
  owner: false,
  run: async (client, interaction, prefix) => {
    await interaction.deferReply({
      ephemeral: false,
    });

    const duration1 = Math.round(
      (Date.now() - interaction.client.uptime) / 1000,
    );
    const Result = Math.floor(Math.random() * 30);
    const guildsCounts = await client.guilds.cache;
    const channelsCounts = await client.channels.cache;
    const usercount = client.guilds.cache.reduce(
      (acc, guild) => acc + guild.memberCount,
      0,
    );
    const ping = Result;

    const embed = new EmbedBuilder()
      
      .setAuthor({
        name: `${client.user.username} Information`,
        iconURL: client.user.displayAvatarURL(),
      })
      .setFooter({
        text: getFooterText(client),
        iconURL: interaction.member.displayAvatarURL({ dynamic: true }),
      })
      .setDescription(
        `>>> . Bot Name : ${client.user.username}\n. Servers : ${guildsCounts.size}\n. Channels : ${channelsCounts.size}\n. Users : ${usercount}\n. Discord.js : v${version}\n. Total Commands : ${client.commands.size}\n. Uptime : <t:${duration1}:R>\n. Ping : ${Result}ms`,
      );

    const embed4 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setStyle(ButtonStyle.Danger)
        .setCustomId(`guild4`)
        .setLabel(`${guildsCounts.size} Servers`)
        .setDisabled(true),
      new ButtonBuilder()
        .setStyle(ButtonStyle.Danger)
        .setCustomId(`guild5`)
        .setLabel(`${usercount} Users`)
        .setDisabled(true),
      new ButtonBuilder()
        .setStyle(ButtonStyle.Danger)
        .setCustomId(`guild6`)
        .setLabel(`${ping}ms`)
        .setDisabled(true),
    );
    interaction.editReply(v2({ embeds: [embed], components: [embed4] }));
  },
};
