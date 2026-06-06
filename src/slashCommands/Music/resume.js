const { v2 } = require("../../utils/v2");
const {
  EmbedBuilder,
  MessageFlags,
  CommandInteraction,
  Client,
} = require("discord.js");

module.exports = {
  name: "resume",
  description: "Resume currently playing music",
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
    const song = player.queue.current;

    const emojiresume = client.emoji.resume;

    if (!player.shoukaku.paused) {
      const thing = new EmbedBuilder()
        
        .setDescription(`${emojiresume} The player is already **resumed**.`);
      return interaction.editReply(v2({ embeds: [thing] }));
    }

    await player.pause(false);

    const thing = new EmbedBuilder()
      .setDescription(
        `${emojiresume} **Resumed**\n[${song.title}](${song.uri})`,
      )
      ;
    return interaction.editReply(v2({ embeds: [thing] }));
  },
};
