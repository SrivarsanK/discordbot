const { v2 } = require("../../utils/v2");
const { CommandInteraction, Client, EmbedBuilder } = require("discord.js");
const { convertTime } = require("../../utils/convert.js");
const ms = require("ms");

module.exports = {
  name: "seek",
  description: "Seek the currently playing song",
  userPrams: [],
  botPrams: ["EMBED_LINKS"],
  dj: true,
  player: true,
  inVoiceChannel: true,
  sameVoiceChannel: true,
  options: [
    {
      name: "time",
      description: "<10s || 10m || 10h>",
      required: true,
      type: 3,
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
    const time = interaction.options.getNumber("number");
    // const time = ms(args[0]);
    const position = player.shoukaku.position;
    const duration = player.queue.current.length;

    const emojiforward = client.emoji.forward;
    const emojirewind = client.emoji.rewind;

    const song = player.queue.current;

    if (time <= duration) {
      if (time > position) {
        await player.shoukaku.seekTo(time);
        const thing = new EmbedBuilder()
          .setDescription(
            `${emojiforward} **Forward**\n[${song.title}](${song.uri})\n\`${convertTime(
              time,
            )} / ${convertTime(duration)}\``,
          )
          ;
        return interaction.editReply(v2({ embeds: [thing] }));
      } else {
        await player.shoukaku.seekTo(time);
        const thing = new EmbedBuilder()
          .setDescription(
            `${emojirewind} **Rewind**\n[${song.title}](${song.uri})\n\`${convertTime(
              time,
            )} / ${convertTime(duration)}\``,
          )
          ;
        return interaction.editReply(v2({ embeds: [thing] }));
      }
    } else {
      const thing = new EmbedBuilder()
        
        .setDescription(
          `Seek duration exceeds Song duration.\nSong duration: \`${convertTime(duration)}\``,
        );
      return interaction.editReply(v2({ embeds: [thing] }));
    }
  },
};
