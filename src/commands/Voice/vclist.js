const { v2 } = require("../../utils/v2");
const {
  EmbedBuilder,
  MessageFlags,
  ButtonBuilder,
  ActionRowBuilder,
  ButtonStyle,
} = require("discord.js");

module.exports = {
  name: "vclist",
  category: "Voice",
  aliases: ["voicelist"],
  description: "",
  args: false,
  usage: "",
  userPerms: [],
  owner: false,
  execute: async (message, args, client, prefix) => {
    if (!message.member.voice.channel) {
      return message.reply(v2({
        embeds: [
          new EmbedBuilder()
            
            .setDescription(`You must be connected to a voice channel first.`),
        ],
      }));
    }
    const members = message.guild.members.cache
      .filter((m) => m.voice?.channel?.id == message.member?.voice?.channel?.id)
      .map((m) => `${m.user.tag} | <@${m.user.id}>`)
      .join(`\n`);
    return message.reply(v2({
      embeds: [
        new EmbedBuilder()
          
          .setDescription(members)
          .setTitle(
            `**Users in ${message.member.voice.channel.name} - ${message.member.voice.channel.members.size}**`,
          ),
      ],
    }));
  },
};
