const { v2 } = require("../../utils/v2");
const {
  EmbedBuilder,
  MessageFlags,
  ButtonBuilder,
  ActionRowBuilder,
  ButtonStyle,
} = require("discord.js");

module.exports = {
  name: "vcmute",
  category: "Voice",
  aliases: ["voicemute"],
  description: "",
  args: false,
  usage: "",
  userPerms: [],
  owner: false,
  execute: async (message, args, client, prefix) => {
    if (!message.member.permissions.has("MuteMembers")) {
      const error = new EmbedBuilder()
        
        .setDescription(
          `You must have \`Mute members\` permission to use this command.`,
        );
      return message.reply(v2({ embeds: [error] }));
    }
    if (!message.guild.members.me.permissions.has("MuteMembers")) {
      const error = new EmbedBuilder()
        
        .setDescription(
          `I must have \`Mute members\` permission to use this command.`,
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
              `You must mention someone whom you want to mute in your vc.`,
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
      member.voice.setMute(
        true,
        `${message.author.tag} (${message.author.id})`,
      );
      message.reply(v2({
        embeds: [
          new EmbedBuilder()
            
            .setDescription(
              `${client.emoji.tick} | Successfully Muted <@${member.user.id}> From Voice!`,
            ),
        ],
      }));
    } catch (err) {
      return message.reply(v2({
        embeds: [
          new EmbedBuilder()
            
            .setDescription(`I was unable to voice mute <@${member.user.id}>.`),
        ],
      }));
    }
  },
};
