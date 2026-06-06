const { v2 } = require("../../utils/v2");
const { EmbedBuilder } = require("discord.js");
const AntiNuke = require("../../schema/antinuke"); // Import the AntiNuke schema

module.exports = {
  name: "extraowner",
  aliases: ["eo"],
  args: true,
  category: "Antinuke",
  description: "Manage extra owners who can handle the antinuke system.",
  execute: async (message, args, client, prefix) => {
    const guildId = message.guild.id;

    // Check if the user is the server owner
    if (message.author.id !== message.guild.ownerId) {
      return message.reply(v2({
        embeds: [
          new EmbedBuilder()
            
            .setDescription(
              `${client.emoji.cross} | Only the **owner** of this server can use this command.`,
            ),
        ],
      }));
    }

    try {
      // Fetch the antinuke configuration
      let antinukeConfig = await AntiNuke.findOne({ guildId });

      // If not configured, create a new document
      if (!antinukeConfig) {
        antinukeConfig = new AntiNuke({ guildId });
        await antinukeConfig.save();
      }

      const option = args[0]?.toLowerCase();

      // Display the current extra owners if "list" or no argument is provided
      if (option === "list") {
        const extraOwners =
          antinukeConfig.extraOwners.map((id) => `<@${id}>`).join(", ") ||
          "No extra owners have been assigned.";

        return message.reply(v2({
          embeds: [
            new EmbedBuilder()
              
              .setTitle("Extra Owners")
              .setDescription(extraOwners),
          ],
        }));
      }

      // Add a user as an extra owner
      if (option === "add") {
        const user = message.mentions.users.first();
        if (!user) {
          return message.reply(v2({
            embeds: [
              new EmbedBuilder()
                
                .setDescription(
                  `Usage: \`${prefix}extraowner add @user\` to assign a user as an extra owner.`,
                ),
            ],
          }));
        }

        // Check if the limit of 3 extra owners has been reached
        if (antinukeConfig.extraOwners.length >= 3) {
          return message.reply(v2({
            embeds: [
              new EmbedBuilder()
                
                .setDescription(
                  `${client.emoji.cross} | You can only assign up to **3 extra owners**. Please remove one to add another.`,
                ),
            ],
          }));
        }

        // Check if the user is already an extra owner
        if (antinukeConfig.extraOwners.includes(user.id)) {
          return message.reply(v2({
            embeds: [
              new EmbedBuilder()
                
                .setDescription(
                  `${client.emoji.cross} | <@${user.id}> is already an extra owner.`,
                ),
            ],
          }));
        }

        // Add the user to the extra owners and save
        antinukeConfig.extraOwners.push(user.id);
        await antinukeConfig.save();

        return message.reply(v2({
          embeds: [
            new EmbedBuilder()
              
              .setDescription(
                `${client.emoji.tick} | Successfully added <@${user.id}> as an extra owner.`,
              ),
          ],
        }));
      }

      // Remove a user from the extra owners
      if (option === "remove") {
        const user = message.mentions.users.first();
        if (!user) {
          return message.reply(v2({
            embeds: [
              new EmbedBuilder()
                
                .setDescription(
                  `Usage: \`${prefix}extraowner remove @user\` to remove a user from extra owners.`,
                ),
            ],
          }));
        }

        // Check if the user is not in the extra owners list
        if (!antinukeConfig.extraOwners.includes(user.id)) {
          return message.reply(v2({
            embeds: [
              new EmbedBuilder()
                
                .setDescription(
                  `${client.emoji.cross} | <@${user.id}> is not an extra owner.`,
                ),
            ],
          }));
        }

        // Remove the user from the extra owners and save
        antinukeConfig.extraOwners = antinukeConfig.extraOwners.filter(
          (id) => id !== user.id,
        );
        await antinukeConfig.save();

        return message.reply(v2({
          embeds: [
            new EmbedBuilder()
              
              .setDescription(
                `${client.emoji.tick} | Successfully removed <@${user.id}> as an extra owner.`,
              ),
          ],
        }));
      }

      // Invalid option
      return message.reply(v2({
        embeds: [
          new EmbedBuilder()
            
            .setDescription(
              `Invalid option! Use \`${prefix}extraowner list\`, \`${prefix}extraowner add @user\`, or \`${prefix}extraowner remove @user\`.`,
            ),
        ],
      }));
    } catch (error) {
      console.error(error);
      return message.reply(v2({
        embeds: [
          new EmbedBuilder()
            
            .setDescription(
              "An error occurred while managing extra owners. Please try again later.",
            ),
        ],
      }));
    }
  },
};
