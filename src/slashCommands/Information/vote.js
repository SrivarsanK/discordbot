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
const { getVoteUrl } = require("../../utils/botMeta");

module.exports = {
  name: "vote",
  description: "Get The Vote Link",
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

    const voteUrl = getVoteUrl(client);
    const color = client.color;
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel("Vote!")
        .setStyle(ButtonStyle.Link)
        .setURL(voteUrl),
    );

    const mainPage = new EmbedBuilder()
      .setDescription(
        `Click [Here](${voteUrl}) To Vote Me Or Click Below `,
      )
      ;
    interaction.editReply(v2({ embeds: [mainPage], components: [row] }));
  },
};
