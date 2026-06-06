/** @format */

const { v2 } = require("../../utils/v2");

const {
  EmbedBuilder,
  ButtonBuilder,
  ActionRowBuilder,
  ButtonStyle,
  PermissionsBitField,
} = require("discord.js");

module.exports = {
  name: "kick",
  category: "Moderation",
  aliases: ["kick"],
  cooldown: 3,
  description: "to kick any user",
  args: true,
  usage: "",
  userPerms: ["KickMembers"],
  botPerms: ["KickMembers"],
  owner: false,
  execute: async (message, args, client, prefix) => {
    if (!message.member.permissions.has(PermissionsBitField.resolve("KickMembers"))) {
      return message.reply(v2({
        embeds: [
          new EmbedBuilder()
            
            .setDescription(
              `${client.emoji.cross} | You must have \`Kick Members\` permissions to use this command.`
            ),
        ],
      }));
    }

    const user =
      message.mentions.members.first() ||
      message.guild.members.cache.get(args[0]);
    let reason = args.slice(1).join(" ") || "No Reason Provided";
    reason = `${message.author.tag} (${message.author.id}) | ` + reason;

    if (!user) {
      return message.reply(v2({
        embeds: [
          new EmbedBuilder()
            
            .setDescription(`${client.emoji.cross} | User Not Found`),
        ],
      }));
    }

    if (user.id === client.user.id) {
      return message.reply(v2({
        embeds: [
          new EmbedBuilder()
            
            .setDescription(`${client.emoji.cross} | You can't kick me.`),
        ],
      }));
    }

    if (user.id === message.guild.ownerId) {
      return message.reply(v2({
        embeds: [
          new EmbedBuilder()
            
            .setDescription(
              `${client.emoji.cross} | I can't kick the owner of this server.`
            ),
        ],
      }));
    }

    if (user.roles.highest.position >= message.member.roles.highest.position &&
      message.author.id !== message.guild.ownerId) {
      return message.reply(v2({
        embeds: [
          new EmbedBuilder()
            
            .setDescription(
              `${client.emoji.cross} | You can't kick a user with a higher or equal role.`
            ),
        ],
      }));
    }

    if (!user.kickable) {
      return message.reply(v2({
        embeds: [
          new EmbedBuilder()
            
            .setDescription(`${client.emoji.cross} | I can't kick this user.`),
        ],
      }));
    }

    await user.kick({ reason });
    return message.channel.send(v2({
      embeds: [
        new EmbedBuilder()
          
          .setDescription(
            `${client.emoji.tick} | Successfully kicked **${user.user.tag}** from the server.`
          ),
      ],
    }));
  },
};
