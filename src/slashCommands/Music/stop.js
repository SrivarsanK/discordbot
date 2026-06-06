const { v2 } = require("../../utils/v2");
const {
  EmbedBuilder,
  MessageFlags,
  CommandInteraction,
  Client,
} = require("discord.js");
const Wait = require("util").promisify(setTimeout);
module.exports = {
  name: "stop",
  description: "Stops the music",
  userPrams: [],
  botPrams: ["EMBED_LINKS"],
  player: true,
  dj: true,
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

    player.queue.length = 0;
    player.data.delete("autoplay");
    player.repeat = "off";
    player.paused = true;
    await player.shoukaku.stopTrack();
    Wait(500);
    const emojistop = client.emoji.stop;
    const thing = new EmbedBuilder()
      
      .setDescription(`${emojistop} Stopped the music`);
    interaction.editReply(v2({ embeds: [thing] }));
  },
};
