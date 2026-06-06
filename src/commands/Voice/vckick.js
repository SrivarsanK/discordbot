const { v2 } = require("../../utils/v2");
const {
  EmbedBuilder,
  MessageFlags,
  ButtonBuilder,
  ActionRowBuilder,
  ButtonStyle,
} = require("discord.js");

module.exports = {
  name: "vckick",
  category: "Voice",
  cooldown: 3,
  aliases: ["voicekick"],
  description: "",
  args: false,
  usage: "",
  userPerms: [],
  owner: false,
  execute: async (message, args, client, prefix) => {
    if (!message.member.permissions.has("MoveMemvers")) {
      const error = new EmbedBuilder()
        
        .setDescription(
          `You must have \`Move members\` permission to use this command.`,
        );
      return message.reply(v2({ embeds: [error] }));
    }
    if (!message.guild.members.me.permissions.has("MoveMembers")) {
      const error = new EmbedBuilder()
        
        .setDescription(
          `I must have \`Move members\` permission to use this command.`,
        );
      return message.reply(v2({ embeds: [error] }));
    }
    if (!message.member.voice.channel) {
      return message.reply(v2({
        embeds: [
          new EmbedBuilder()
            
            .setDescription(`You must be connected to a voice channel first.`),
        ],
      }));
    }
    if (!message.mentions.members.first()) {
      return message.reply(v2({
        embeds: [
          new EmbedBuilder()
            
            .setDescription(
              `You must mention someone whom you want to kick from your vc.`,
            ),
        ],
      }));
    }
    const member = message.mentions.members.first();
    if (!member.voice.channel) {
      return message.reply(v2({
        embeds: [
          new EmbedBuilder()
            
            .setDescription(`<@${member.user.id}> is not in your vc.`),
        ],
      }));
    }
    try {
      member.voice.disconnect();
      message.reply(v2({
        embeds: [
          new EmbedBuilder()
            
            .setDescription(
              `${client.emoji.tick} | Successfully Kicked <@${member.user.id}> From Voice!`,
            ),
        ],
      }));
    } catch (err) {
      return message.reply(v2({
        embeds: [
          new EmbedBuilder()
            
            .setDescription(`I was unable to voice kick <@${member.user.id}>.`),
        ],
      }));
    }
  },
};
