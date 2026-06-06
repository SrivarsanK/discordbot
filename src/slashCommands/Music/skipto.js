const { v2 } = require("../../utils/v2");
const { CommandInteraction, Client, EmbedBuilder } = require("discord.js");

module.exports = {
  name: "skipto",
  description: "Forward song",
  userPrams: [],
  botPrams: ["EMBED_LINKS"],
  player: true,
  dj: true,
  inVoiceChannel: true,
  sameVoiceChannel: true,
  options: [
    {
      name: "number",
      description: "select a song number",
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
    const args = interaction.options.getNumber("number");
    const player = client.manager.players.get(interaction.guildId);

    if (!player.queue.current) {
      const thing = new EmbedBuilder()
        
        .setDescription("There is no music playing.");
      return await interaction.editReply(v2({ embeds: [thing] }));
    }

    const position = Number(args);

    if (!position || position < 0 || position > player.queue.size) {
      const thing = new EmbedBuilder()
        
        .setDescription(`Usage: ${prefix}volume <Number of song in queue>`);
      return await interaction.editReply(v2({ embeds: [thing] }));
    }
    if (args[0] == 1) player.shoukaku.stopTrack();
    player.queue.splice(0, position - 1);
    await player.shoukaku.stopTrack();

    const emojijump = client.emoji.jump;

    const thing = new EmbedBuilder()
      .setDescription(`${emojijump} Forward **${position}** Songs`)
      ;
    return await interaction.editReply(v2({ embeds: [thing] }));
  },
};
