const { v2 } = require("../../utils/v2");
const { AttachmentBuilder } = require("discord.js");
const canvafy = require("canvafy");

module.exports = {
  name: "ship",
  category: "Image",
  cooldown: 5,
  description: "Ship two users together or ship with a random user.",
  execute: async (message, args, client) => {
    try {
      // Handle 'random' argument
      if (args[0] && args[0].toLowerCase() === "random") {
        const members = message.guild.members.cache.filter(
          member => !member.user.bot && member.id !== message.author.id
        );

        const memberArray = members.map(member => member.user);

        if (memberArray.length === 0) {
          return message.reply(v2("There are no other users to ship with."));
        }

        const randomUser =
          memberArray[Math.floor(Math.random() * memberArray.length)];
        return shipUsers(message, message.author, randomUser, client);
      }

      // Handle mentioned user
      const member = message.mentions.members.first();
      if (!member || member.user.bot) {
        return message.reply(v2("Please mention a valid user to ship with."));
      }

      // Call the ship logic
      shipUsers(message, message.author, member.user, client);
    } catch (error) {
      console.error("Error executing ship command:", error.stack || error);
      message.reply(v2("An unexpected error occurred while processing your request."));
    }
  },
};

async function shipUsers(message, user1, user2, client) {
  try {
    // Ensure a valid hexadecimal color
    const borderColor = client.color && /^#[0-9A-F]{6}$/i.test(client.color)
      ? client.color
      : "#FFFFFF"; // Fallback to white if client.color is invalid

    // Validate avatar URLs
    const avatar1 = user1.displayAvatarURL({ extension: "png", size: 512 });
    const avatar2 = user2.displayAvatarURL({ extension: "png", size: 512 });

    if (!avatar1 || !avatar2) {
      return message.reply(v2("Could not fetch user avatars. Please try again."));
    }

    // Generate the ship image using Canvafy
    const loveImage = await new canvafy.Ship()
      .setAvatars(avatar1, avatar2)
      .setBackground("color", "#372d52") // Set background color
      .setBorder(borderColor) // Use a valid hexadecimal color
      .setOverlayOpacity(0.5) // Adjust overlay transparency
      .build();

    // Send the ship image as an attachment
    const attachment = new AttachmentBuilder(loveImage, { name: "ship.png" });
    await message.channel.send(v2({
      content: `${user1.username} ❤️ ${user2.username}`,
      files: [attachment],
    }));
  } catch (error) {
    console.error("Error generating ship image:", error.stack || error);
    if (
      error.message.includes("Invalid color") ||
      error.message.includes("The image given in the argument")
    ) {
      message.reply(v2("There was an issue generating the ship image. Please check your inputs."));
    } else {
      message.reply(v2("An unexpected error occurred while generating the ship image."));
    }
  }
}
