const { v2 } = require("../../utils/v2");
const { EmbedBuilder } = require("discord.js");

module.exports = {
  name: "unmute",
  category: "Moderation",
  aliases: ["unmuteuser"],
  cooldown: 3,
  description: "Unmute a user in the server.",
  args: false,
  usage: "<@user|user_id>",
  userPerms: ["ModerateMembers"],
  botPerms: ["ModerateMembers"],
  owner: false,
  execute: async (message, args, client, prefix) => {
    // Check user permissions
    if (!message.member.permissions.has("ModerateMembers")) {
      return message.reply(v2({
        embeds: [
          new EmbedBuilder()
            
            .setDescription(
              `${client.emoji.cross} | You must have \`Timeout Members\` permissions to use this command.`,
            ),
        ],
      }));
    }

    // Check bot permissions
    if (!message.guild.members.me.permissions.has("ModerateMembers")) {
      return message.reply(v2({
        embeds: [
          new EmbedBuilder()
            
            .setDescription(
              `${client.emoji.cross} | I must have \`Timeout Members\` permissions to execute this command.`,
            ),
        ],
      }));
    }

    // Get the target member
    const member =
      message.mentions.members.first() ||
      message.guild.members.cache.get(args[0]);

    if (!member) {
      return message.reply(v2({
        embeds: [
          new EmbedBuilder()
            
            .setDescription(
              `${client.emoji.cross} | Please mention a valid user or provide their ID.`,
            ),
        ],
      }));
    }

    // Prevent the bot itself from being targeted
    if (member.id === client.user.id) {
      return message.reply(v2({
        embeds: [
          new EmbedBuilder()
            
            .setDescription(`${client.emoji.cross} | I can't unmute myself.`),
        ],
      }));
    }

    // Prevent the command user from targeting themselves
    if (member.id === message.author.id) {
      return message.reply(v2({
        embeds: [
          new EmbedBuilder()
            
            .setDescription(
              `${client.emoji.cross} | You can't unmute yourself.`,
            ),
        ],
      }));
    }

    // Check if the member is currently muted
    if (member.communicationDisabledUntilTimestamp === null) {
      return message.reply(v2({
        embeds: [
          new EmbedBuilder()
            
            .setDescription(
              `${client.emoji.cross} | This user is not currently muted.`,
            ),
        ],
      }));
    }

    // Attempt to remove the timeout (unmute the user)
    try {
      await member.timeout(null);

      return message.reply(v2({
        embeds: [
          new EmbedBuilder()
            
            .setDescription(
              `${client.emoji.tick} | Successfully unmuted <@${member.user.id}>!`,
            ),
        ],
      }));
    } catch (error) {
      console.error(error);
      return message.reply(v2({
        embeds: [
          new EmbedBuilder()
            
            .setDescription(
              `${client.emoji.cross} | An error occurred while trying to unmute this user. Please try again later.`,
            ),
        ],
      }));
    }
  },
};
