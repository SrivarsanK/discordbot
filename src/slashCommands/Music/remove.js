const { v2 } = require("../../utils/v2");
const { CommandInteraction, Client, EmbedBuilder } = require("discord.js");

module.exports = {
  name: "remove",
  description: "Remove song from the queue",
  userPrams: [],
  botPrams: ["EMBED_LINKS"],
  dj: true,
  player: true,
  inVoiceChannel: true,
  sameVoiceChannel: true,
  options: [
    {
      name: "number",
      description: "Number of song in queue",
      required: true,
      type: 10,
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
    const player = client.manager.players.get(interaction.guild.id);

    const numm = interaction.options.getNumber("number");
    const position = Number(numm) - 1;
    if (position > player.queue.length) {
      const number = position + 1;
      const thing = new EmbedBuilder()
        
        .setDescription(
          `No songs at number ${number}.\nTotal Songs: ${player.queue.length}`,
        );
      return interaction.editReply(v2({ embeds: [thing] }));
    }

    const song = player.queue[position];

    await player.queue.splice(position);

    const emojieject = client.emoji.remove;

    const thing = new EmbedBuilder()
      
      .setDescription(`${emojieject} Removed\n[${song.title}](${song.uri})`);
    return interaction.editReply(v2({ embeds: [thing] }));
  },
};
