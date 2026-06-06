const { v2 } = require("../../utils/v2");
const {
  EmbedBuilder,
  MessageFlags,
  CommandInteraction,
  Client,
} = require("discord.js");

module.exports = {
  name: "bass",
  description: "Sets Bass Filter.",
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
            
            .setDescription(`${emojiequalizer} Bass Mode Is \`OFF\``),
        ],
      }));
    } else if (input === "1") {
      await player.shoukaku.setFilters({
        op: "filters",
        guildId: interaction.guild.id,
        equalizer: [
          { band: 0, gain: 0.1 },
          { band: 1, gain: 0.1 },
          { band: 2, gain: 0.05 },
          { band: 3, gain: 0.05 },
          { band: 4, gain: -0.05 },
          { band: 5, gain: -0.05 },
          { band: 6, gain: 0 },
          { band: 7, gain: -0.05 },
          { band: 8, gain: -0.05 },
          { band: 9, gain: 0 },
          { band: 10, gain: 0.05 },
          { band: 11, gain: 0.05 },
          { band: 12, gain: 0.1 },
          { band: 13, gain: 0.1 },
        ],
      });
      return await interaction.editReply(v2({
        embeds: [
          new EmbedBuilder()
            
            .setDescription(`${emojiequalizer} Bass Mode Is \`ON\``),
        ],
      }));
    }
  },
};
