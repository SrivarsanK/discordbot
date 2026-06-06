const { v2 } = require("../../utils/v2");
const { EmbedBuilder, MessageFlags, AttachmentBuilder } = require("discord.js");
const { Canvas } = require("canvafy");

module.exports = {
  name: "beautiful",
  description: "Create a 'beautiful' meme image for the mentioned user.",
  usage: "beautiful <user>",
  cooldown: 3,
  category: "Image",
  execute: async (message, args, client, prefix) => {
    const user = message.mentions.users.first() || message.author; // Default to the author if no user is mentioned.
    const avatar = user.displayAvatarURL({
      dynamic: false,
      format: "png",
      size: 512,
    }); // Canvafy supports PNG format.

    try {
      // Generate the 'beautiful' image.
      const canvas = new Canvas();
      const image = await canvas.beautiful(avatar);

      // Create an attachment and embed the image.
      const attachment = new AttachmentBuilder(image, {
        name: "beautiful.png",
      });
      const embed = new EmbedBuilder()
        .setTitle(`${user.username} looks... beautiful!`)
        
        .setImage("attachment://beautiful.png");

      return message.channel.send(v2({ embeds: [embed], files: [attachment] }));
    } catch (error) {
      console.error(error);
      return message.reply(v2("An error occurred while generating the image."));
    }
  },
};
