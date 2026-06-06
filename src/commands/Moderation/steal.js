const { v2 } = require("../../utils/v2");
const { EmbedBuilder } = require("discord.js");
const { default: axios } = require("axios");

module.exports = {
  name: "steal",
  category: "Moderation",
  aliases: ["steal", "addemoji"],
  description: "Adds an emoji to the server.",
  args: false,
  usage: "<emoji> [name]",
  userPerms: ["ManageEmojisAndStickers"],
  owner: false,
  execute: async (message, args, client, prefix) => {
    // Permission checks
    if (!message.member.permissions.has("ManageEmojisAndStickers")) {
      return message.channel.send(v2({
        embeds: [
          new EmbedBuilder()
            
            .setDescription(
              `${client.emoji.cross} | You must have \`Manage Emoji\` perms to use this command.`,
            ),
        ],
      }));
    }
    if (!message.guild.members.me.permissions.has("ManageEmojisAndStickers")) {
      return message.channel.send(v2({
        embeds: [
          new EmbedBuilder()
            
            .setDescription(
              `${client.emoji.cross} | I must have \`Manage Emoji\` perms to use this command.`,
            ),
        ],
      }));
    }

    // Fetch emoji either from reply or arguments
    let emoji;
    if (message.reference) {
      const referencedMessage = await message.channel.messages.fetch(
        message.reference.messageId,
      );
      emoji = referencedMessage.content.trim(); // Get the emoji from the replied message content
    } else {
      emoji = args[0]; // Use args[0] if no reply is provided
    }

    if (!emoji) {
      return message.reply(
        v2("Please provide or reply to a message with the emoji to add."),
      );
    }

    // Ensure emoji is a string
    emoji = String(emoji);
    let name = args[1];
    let emojiID, emojiName;

    // Check if the emoji is a custom Discord emoji (starts with < and ends with >)
    if (emoji.startsWith("<") && emoji.endsWith(">")) {
      // Extract ID and name using regex
      const match = emoji.match(/<?a?:?(\w+):(\d+)>?/);
      if (!match) {
        return message.reply(v2("Invalid emoji format."));
      }
      emojiName = match[1];
      emojiID = match[2];

      // Assign original name if no custom name is provided
      name = name || emojiName;

      // Determine emoji type (gif or png)
      const type = await axios
        .get(`https://cdn.discordapp.com/emojis/${emojiID}.gif`)
        .then(() => "gif")
        .catch(() => "png");

      emoji = `https://cdn.discordapp.com/emojis/${emojiID}.${type}?quality=lossless`;
    }
    // Check if the emoji is a valid URL (for external image URLs)
    else if (isValidUrl(emoji)) {
      name = name || emoji.split("/").pop().split(".")[0]; // Use the image file name as the emoji name if none provided
    } else {
      return message.reply(
        v2("Invalid emoji format. Please provide a valid custom emoji or a valid image URL."),
      );
    }

    // Add emoji to the server
    try {
      const newEmoji = await message.guild.emojis.create({
        attachment: emoji,
        name,
      });
      const embed = new EmbedBuilder()
        
        .setDescription(
          `${client.emoji.tick} | Successfully added the emoji ${newEmoji.toString()}.`,
        );
      message.channel.send(v2({ embeds: [embed] }));
    } catch (err) {
      message.reply(v2({
        embeds: [
          new EmbedBuilder()
            
            .setDescription(
              `${client.emoji.cross} | I was unable to add the emoji.\nPossible reasons: \`Mass emojis added\`, \`Slots are full\`, \`Invalid URL\`.`,
            ),
        ],
      }));
    }
  },
};

// Helper function to check if the string is a valid URL
function isValidUrl(string) {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
}
