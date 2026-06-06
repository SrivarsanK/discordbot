const { v2 } = require("../../utils/v2");
const {
  EmbedBuilder,
  MessageFlags,
  CommandInteraction,
  Client,
} = require("discord.js");

module.exports = {
  name: "pause",
  description: "Pause the currently playing music",
  userPrams: [],
  botPrams: ["EMBED_LINKS"],
  dj: true,
  player: true,
  inVoiceChannel: true,
  sameVoiceChannel: true,

  /**
   *
   * @param {Client} client
   * @param {CommandInteraction} interaction
   */

  run: async (client, interaction) => {
    await interaction.deferReply({
      ephemeral: false,
    });
    const player = client.manager.players.get(interaction.guild.id);
    const emojipause = client.emoji.pause;

    if (player.shoukaku.paused) {
      const thing = new EmbedBuilder()
        
        .setDescription(`${emojipause} The player is already paused.`);
      return interaction.editReply(v2({ embeds: [thing] }));
    }

    await player.pause(true);

    const song = player.queue.current;

    const thing = new EmbedBuilder()
      
      .setDescription(`${emojipause} **Paused**\n[${song.title}](${song.uri})`);
    return interaction.editReply(v2({ embeds: [thing] }));
  },
};
