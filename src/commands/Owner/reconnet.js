const { v2 } = require("../../utils/v2");
const {
  EmbedBuilder,
  MessageFlags,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const db = require("../../schema/247");

module.exports = {
  name: "reconnet",
  aliases: ["reconnet", "24h"],
  category: "Owner",
  description: "Sets 24/7 mode, bot stays in voice channel 24/7.",
  args: false,
  usage: "",
  userPerms: [],
  owner: true,
  player: true,
  inVoiceChannel: true,
  sameVoiceChannel: true,
  execute: async (message, args, client, prefix) => {
    const player = client.manager.players.get(message.guild.id);

    let data = await db.findOne({ Guild: message.guild.id });
    if (data) {
      await data.delete();
      const thing = new EmbedBuilder()
        
        .setDescription(`${client.emoji.tick} | 247 Mode is **Disabled**`);
      message.reply(v2({ embeds: [thing] }));
    } else {
      data = new db({
        Guild: player.guildId,
        TextId: player.textId,
        VoiceId: player.voiceId,
      });
      await data.save();
      const thing = new EmbedBuilder()
        
        .setDescription(`${client.emoji.tick} | 247 Mode is **Enabled**`);
      message.reply(v2({ embeds: [thing] }));
    }
  },
};
