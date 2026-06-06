const { v2 } = require("../../utils/v2");
const {
  EmbedBuilder,
  MessageFlags,
  CommandInteraction,
  Client,
} = require("discord.js");

module.exports = {
  name: "speed",
  description: "Sets Speed Filter.",
  userPrams: [],
  botPrams: ["EMBED_LINKS"],
  player: true,
  dj: true,
  inVoiceChannel: true,
  sameVoiceChannel: true,
  options: [
    {
      name: "input",
      description: "The Filters input (on or off).",
      type: 3, // STRING type
      required: true,
      choices: [
        {
          name: "on",
          value: "1", // value should be a string
        },
        {
          name: "off",
          value: "2", // value should be a string
        },
      ],
    },
  ],
  /**
   * @param {Client} client
   * @param {CommandInteraction} interaction
   */

  run: async (client, interaction, prefix) => {
    await interaction.deferReply({
      ephemeral: false,
    });
    const input = interaction.options.getString("input");
    const player = client.manager.players.get(interaction.guild.id);

    const emojiequalizer = interaction.client.emoji.filter;
    if (input === "2") {
      await player.shoukaku.clearFilters();
      return await interaction.editReply(v2({
        embeds: [
          new EmbedBuilder()
            
            .setDescription(`${emojiequalizer} Speed Mode Is \`OFF\``),
        ],
      }));
    } else if (input === "1") {
      await player.shoukaku.setFilters({
        op: "filters",
        guildId: interaction.guild.id,
        timescale: {
          speed: 1.501,
          pitch: 1.245,
          rate: 1.921,
        },
      });
      return await interaction.editReply(v2({
        embeds: [
          new EmbedBuilder()
            
            .setDescription(`${emojiequalizer} Speed Mode Is \`ON\``),
        ],
      }));
    }
  },
};
