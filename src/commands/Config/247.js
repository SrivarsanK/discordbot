const { v2 } = require("../../utils/v2");
const { EmbedBuilder } = require("discord.js");
const db = require("../../schema/247");

module.exports = {
  name: "247",
  category: "Config",
  description: "To force skip the current playing song.",
  args: false,
  usage: "",
  userPrams: [],
  botPrams: ["EMBED_LINKS"],
  owner: false,
  voteonly: false,
  player: true,
  dj: true,
  inVoiceChannel: true,
  sameVoiceChannel: true,
  cooldown: 3,
  execute: async (message, args, client, prefix) => {
    const player = client.manager.players.get(message.guild.id);
    let data = await db.findOne({ Guild: message.guild.id });
    if (data) {
      await data.deleteOne();
      const thing = new EmbedBuilder().setAuthor({
        name: `- 247 Mode is Disabled`,
        iconURL: message.author.displayAvatarURL(),
      });
      message.reply(v2({ embeds: [thing] }));
    } else {
      data = new db({
        Guild: player.guildId,
        TextId: player.textId,
        VoiceId: player.voiceId,
      });
      await data.save();
      const thing = new EmbedBuilder()
        .setAuthor({
          name: `- 247 Mode is Enabled`,
          iconURL: message.author.displayAvatarURL(),
        })
        ;
      message.reply(v2({ embeds: [thing] }));
    }
  },
};
