const { v2 } = require("../../utils/v2");
const { CommandInteraction, Client, EmbedBuilder } = require("discord.js");

module.exports = {
  name: "volume",
  description: "Changes volume of currently playing music.",
  userPrams: [],
  botPrams: ["EMBED_LINKS"],
  player: true,
  dj: true,
  inVoiceChannel: true,
  sameVoiceChannel: true,
  options: [
    {
      name: "number",
      description: "give your volume number ",
      required: true,
      type: 10,
    },
  ],

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

    const emojivolume = client.emoji.volumehigh;

    const vol = interaction.options.getNumber("number");

    const player = client.manager.players.get(interaction.guildId);

    const volume = Number(vol);
    if (!volume || volume < 0 || volume > 999)
      return await interaction
        .editReply(v2({
          embeds: [
            new EmbedBuilder()
              
              .setDescription(
                `Usage: ${client.prefix}volume <Number of volume between 0 - 250>`,
              ),
          ],
        }))
        .catch(() => {});
    await player.setVolume(volume / 1);
    if (volume > player.volume)
      return await interaction
        .editReply(v2({
          embeds: [
            new EmbedBuilder()
              
              .setDescription(`${emojivolume} Volume set to: **${volume}%**`),
          ],
        }))
        .catch(() => {});
    else if (volume < player.volume)
      return await interaction
        .editReply(v2({
          embeds: [
            new EmbedBuilder()
              
              .setDescription(`${emojivolume} Volume set to: **${volume}%**`),
          ],
        }))
        .catch(() => {});
    else
      await interaction
        .editReply(v2({
          embeds: [
            new EmbedBuilder()
              
              .setDescription(`${emojivolume} Volume set to: **${volume}%**`),
          ],
        }))
        .catch(() => {});
  },
};
