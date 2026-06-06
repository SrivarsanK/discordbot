const { v2 } = require("../../utils/v2");
const {
  EmbedBuilder,
  MessageFlags,
  CommandInteraction,
  Client,
} = require("discord.js");
const db = require("../../schema/247");

module.exports = {
  name: "247",
  description: "To force skip the current playing song.",
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

    let data = await db.findOne({ Guild: interaction.guild.id });
    if (data) {
      await data.deleteOne();
      const thing = new EmbedBuilder().setAuthor({
        name: `| 247 Mode is Disabled`,
        iconURL: interaction.member.displayAvatarURL(),
      });
      interaction.editReply(v2({ embeds: [thing] }));
    } else {
      data = new db({
        Guild: player.guildId,
        TextId: player.textId,
        VoiceId: player.voiceId,
      });
      await data.save();
      const thing = new EmbedBuilder().setAuthor({
        name: `| 247 Mode is Enabled`,
        iconURL: interaction.member.displayAvatarURL(),
      });
      interaction.editReply(v2({ embeds: [thing] }));
    }
  },
};
