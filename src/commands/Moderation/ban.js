const { v2 } = require("../../utils/v2");
const {
  EmbedBuilder,
  MessageFlags,
  PermissionsBitField,
} = require("discord.js");

module.exports = {
  name: "ban",
  category: "Moderation",
  aliases: ["Ban"],
  cooldown: 3,
  description: "Ban a user from the server",
  args: true,
  usage: "<user> [reason]",
  userPerms: ["BanMembers"],
  botPerms: ["BanMembers"],
  owner: false,
  execute: async (message, args, client, prefix) => {
    if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
      return message.reply(v2({
        embeds: [
          new EmbedBuilder()
            
            .setDescription(
              `${client.emoji.cross} | You need the \`Ban Members\` permission to use this command.`,
            ),
        ],
      }));
    }

    if (
      !message.guild.members.me.permissions.has(
        PermissionsBitField.Flags.BanMembers,
      )
    ) {
      return message.reply(v2({
        embeds: [
          new EmbedBuilder()
            
            .setDescription(
              `${client.emoji.cross} | I need the \`Ban Members\` permission to perform this action.`,
            ),
        ],
      }));
    }

    const user =
      message.mentions.members.first() ||
      message.guild.members.cache.get(args[0]);
    const reason = args.slice(1).join(" ") || "No reason provided";

    if (!user) {
      return message.reply(v2({
        embeds: [
          new EmbedBuilder()
            
            .setDescription(
              `${client.emoji.cross} | User not found. Please mention a valid user or provide their ID.`,
            ),
        ],
      }));
    }

    if (user.id === client.user.id) {
      return message.reply(v2({
        embeds: [
          new EmbedBuilder()
            
            .setDescription(`${client.emoji.cross} | I cannot ban myself.`),
        ],
      }));
    }

    if (user.id === message.guild.ownerId) {
      return message.reply(v2({
        embeds: [
          new EmbedBuilder()
            
            .setDescription(
              `${client.emoji.cross} | You cannot ban the server owner.`,
            ),
        ],
      }));
    }

    if (
      user.roles.highest.position >= message.member.roles.highest.position &&
      message.author.id !== message.guild.ownerId
    ) {
      return message.reply(v2({
        embeds: [
          new EmbedBuilder()
            
            .setDescription(
              `${client.emoji.cross} | You cannot ban a user with an equal or higher role than yours.`,
            ),
        ],
      }));
    }

    if (
      user.roles.highest.position >=
      message.guild.members.me.roles.highest.position
    ) {
      return message.reply(v2({
        embeds: [
          new EmbedBuilder()
            
            .setDescription(
              `${client.emoji.cross} | I cannot ban a user with an equal or higher role than mine.`,
            ),
        ],
      }));
    }

    if (!user.bannable) {
      return message.reply(v2({
        embeds: [
          new EmbedBuilder()
            
            .setDescription(
              `${client.emoji.cross} | I am unable to ban this user.`,
            ),
        ],
      }));
    }

    // Ban the user
    try {
      await user.ban({ reason: `Banned by ${message.author.tag}: ${reason}` });

      // Notify the server
      const successEmbed = new EmbedBuilder()
        
        .setDescription(
          `${client.emoji.tick} | Successfully banned **${user.user.tag}** for: ${reason}`,
        );
      message.channel.send(v2({ embeds: [successEmbed] }));

      // Notify the banned user
      const dmEmbed = new EmbedBuilder()
        
        .setDescription(
          `You have been banned from **${message.guild.name}**.\nReason: ${reason}`,
        );
      await user.send(v2({ embeds: [dmEmbed] })).catch(() => {
        message.channel.send(v2({
          embeds: [
            new EmbedBuilder()
              
              .setDescription(
                `${client.emoji.warning} | Could not notify the user about the ban.`,
              ),
          ],
        }));
      });
    } catch (error) {
      console.error(error);
      message.reply(v2({
        embeds: [
          new EmbedBuilder()
            
            .setDescription(
              `${client.emoji.cross} | There was an error banning the user.`,
            ),
        ],
      }));
    }
  },
};
