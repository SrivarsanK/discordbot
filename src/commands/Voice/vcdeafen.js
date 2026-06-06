const { v2 } = require("../../utils/v2");
const {
  EmbedBuilder,
  MessageFlags,
  ButtonBuilder,
  ActionRowBuilder,
  ButtonStyle,
} = require("discord.js");

module.exports = {
  name: "vcdeafen",
  category: "Voice",
  aliases: ["vcdef"],
  cooldown: 3,
  description: "",
  args: false,
  usage: "",
  userPerms: [],
  owner: false,
  execute: async (message, args, client, prefix) => {
    if (!message.member.permissions.has("DeafenMembers")) {
      const error = new EmbedBuilder()
        
        .setDescription(
          `You must have \`Deafen members\` permission to use this command.`,
        );
      return message.reply(v2({ embeds: [error] }));
    }
    if (!message.guild.members.me.permissions.has("DeafenMembers")) {
      const error = new EmbedBuilder()
        
        .setDescription(
          `I must have \`Deafen members\` permission to use this command.`,
        );
      return message.reply(v2({ embeds: [error] }));
    }
    if (!message.member.voice.channel) {
      return message.reply(v2({
        embeds: [
          new EmbedBuilder().setAuthor({
            name: "You must be connected to a voice channel first!",
            iconURL: message.author.displayAvatarURL(),
          }),
        ],
      }));
    }
    if (!message.mentions.members.first()) {
      return message.reply(v2({
        embeds: [
          new EmbedBuilder().setAuthor({
            name: "You must mention someone whom you want to deafen in your vc!",
            iconURL: message.author.displayAvatarURL(),
          }),
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
      member.voice.setDeaf(
        true,
        `${message.author.tag} (${message.author.id})`,
      );
      message.reply(v2({
        embeds: [
          new EmbedBuilder()
            
            .setDescription(
              `${client.emoji.tick} | Successfully deafened <@${member.user.id}> From Voice!`,
            ),
        ],
      }));
    } catch (err) {
      return message.reply(v2({
        embeds: [
          new EmbedBuilder()
            
            .setDescription(
              `I was unable to voice deafen <@${member.user.id}>.`,
            ),
        ],
      }));
    }
  },
};
