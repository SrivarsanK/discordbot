const { v2 } = require("../../utils/v2");
const {
  EmbedBuilder,
  MessageFlags,
  PermissionsBitField,
} = require("discord.js");

module.exports = {
  name: "purge",
  category: "Moderation",
  aliases: ["clean"],
  cooldown: 3,
  description: "Delete messages in bulk.",
  args: true,
  usage: "<number_of_messages>",
  userPerms: ["ManageMessages"],
  owner: false,
  execute: async (message, args, client, prefix) => {
    // Check if the user has the required permissions
    if (
      !message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)
    ) {
      return message.reply(v2({
        embeds: [
          new EmbedBuilder()
            
            .setDescription(
              `${client.emoji.cross} | You must have \`Manage Messages\` permissions to use this command.`,
            ),
        ],
      }));
    }

    // Validate the amount argument
    const amount = parseInt(args[0]);
    if (!amount || isNaN(amount)) {
      return message.reply(v2({
        embeds: [
          new EmbedBuilder()
            
            .setDescription(
              `${client.emoji.cross} | You must provide a valid number of messages to delete.`,
            ),
        ],
      }));
    }

    if (amount < 1 || amount > 100) {
      return message.reply(v2({
        embeds: [
          new EmbedBuilder()
            
            .setDescription(
              `${client.emoji.cross} | You can delete between 1 and 100 messages at a time.`,
            ),
        ],
      }));
    }

    // Attempt to delete the messages
    try {
      await message.channel.bulkDelete(amount, true);
      return message.channel.send(v2({
        embeds: [
          new EmbedBuilder()
            
            .setDescription(
              `${client.emoji.tick} | Successfully deleted **${amount}** messages.`,
            ),
        ],
      }));
    } catch (error) {
      console.error(error);
      return message.reply(v2({
        embeds: [
          new EmbedBuilder()
            
            .setDescription(
              `${client.emoji.cross} | An error occurred while trying to delete messages.`,
            ),
        ],
      }));
    }
  },
};
