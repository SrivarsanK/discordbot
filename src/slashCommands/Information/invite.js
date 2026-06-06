const { v2 } = require("../../utils/v2");
const {
  EmbedBuilder,
  MessageFlags,
  CommandInteraction,
  Client,
  ButtonBuilder,
  ActionRowBuilder,
  ButtonStyle,
} = require("discord.js");
const { getInviteUrl } = require("../../utils/botMeta");

module.exports = {
  name: "invite",
  description: "Get The Bot Invite Link",
  userPrams: [],
  botPrams: ["EMBED_LINKS"],
  owner: false,

  /**
   *
   * @param {Client} client
   * @param {CommandInteraction} interaction
   */

  run: async (client, interaction, prefix) => {
    await interaction.deferReply({
      ephemeral: false,
    });

    const invite = getInviteUrl(client);
    const color = client.color;
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel("Invite")
        .setStyle(ButtonStyle.Link)
        .setURL(invite),
    );

    const mainPage = new EmbedBuilder()
      .setDescription(`Click [Here](${invite}) To Invite Me Or Click Below `)
      ;
    interaction.editReply(v2({ embeds: [mainPage], components: [row] }));
  },
};
