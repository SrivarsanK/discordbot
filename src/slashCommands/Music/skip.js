const { v2 } = require("../../utils/v2");
const { CommandInteraction, Client, EmbedBuilder } = require("discord.js");
const { trackLink } = require("../../utils/botMeta");

module.exports = {
  name: "skip",
  description: "To skip a song/track from the queue.",
  player: true,
  dj: true,
  inVoiceChannel: true,
  sameVoiceChannel: true,

  /**
   *
   * @param {Client} client
   * @param {CommandInteraction} interaction
   * @param {String} color
   */

  run: async (client, interaction) => {
    await interaction.deferReply({
      ephemeral: false,
    });
    const player = client.manager.players.get(interaction.guild.id);

    if (player.queue.length == 0) {
      const noskip = new EmbedBuilder()
        
        .setDescription(`No more songs left in the queue to skip.`);
      return interaction.editReply(v2({ embeds: [noskip] }));
    }

    player.skip();

    const emojiskip = client.emoji.skip;

    const thing = new EmbedBuilder()
      .setDescription(
        `${emojiskip} **Skipped**\n${trackLink(player.queue.current)}`,
      )
      ;
    return interaction.editReply(v2({ embeds: [thing] }));
  },
};
