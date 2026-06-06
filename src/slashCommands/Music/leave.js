const { v2 } = require("../../utils/v2");
const {
  EmbedBuilder,
  MessageFlags,
  CommandInteraction,
  Client,
} = require("discord.js");

module.exports = {
  name: "leave",
  description: "Leave voice channel",
  userPrams: [],
  botPrams: ["EMBED_LINKS"],
  dj: true,
  player: false,
  inVoiceChannel: true,
  sameVoiceChannel: true,
  run: async (client, interaction) => {
    await interaction.deferReply({
      ephemeral: false,
    });
    const player = client.manager.players.get(interaction.guild.id);

    const emojiLeave = interaction.client.emoji.leave;

    await player.destroy();

    const thing = new EmbedBuilder()
      
      .setDescription(`${emojiLeave} **Leaved the voice channel**`);
    return interaction.editReply(v2({ embeds: [thing] }));
  },
};
