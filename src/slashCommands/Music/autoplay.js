const { v2 } = require("../../utils/v2");
const {
  EmbedBuilder,
  MessageFlags,
  CommandInteraction,
  Client,
} = require("discord.js");

module.exports = {
  name: "autoplay",
  description: "Toggle music autoplay",
  userPrams: [],
  botPrams: ["EMBED_LINKS"],
  player: true,
  dj: true,
  inVoiceChannel: true,
  sameVoiceChannel: true,
  run: async (client, interaction) => {
    await interaction.deferReply({
      ephemeral: false,
    });

    const player = client.manager.players.get(interaction.guild.id);
    const emojireplay = client.emoji.autoplay;
    const autoplay = player.data.get("autoplay");
    if (autoplay === true) {
      player.data.set("autoplay", false);
      const thing = new EmbedBuilder().setAuthor({
        name: "Autoplay is now disabled",
        iconURL: interaction.member.displayAvatarURL(),
      });
      return interaction.editReply(v2({ embeds: [thing] }));
    } else {
      player.data.set("autoplay", true);
      player.data.set("requester", client.user);
      player.data.set("identifier", player.queue.current?.identifier);
      const thing = new EmbedBuilder().setAuthor({
        name: "Autoplay is now enabled",
        iconURL: interaction.member.displayAvatarURL(),
      });
      return interaction.editReply(v2({ embeds: [thing] }));
    }
  },
};
