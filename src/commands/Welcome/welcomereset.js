const { v2 } = require("../../utils/v2");
const { EmbedBuilder } = require("discord.js");
const { getSettings } = require("../../schema/welcomesystem");

module.exports = {
  name: "welcomereset",
  category: "Welcome",
  aliases: ["rwelc-all"],
  description: "Reset the welcomer settings for this server.",
  args: false,
  usage: "",
  userPerms: ["Administrator"], // This explicitly sets the required permission.
  owner: false,
  execute: async (message, args, client, prefix) => {
    const settings = await getSettings(message.guild);

    // Check for proper permissions.
    if (!message.member.permissions.has("Administrator")) {
      return message.reply(v2({
        embeds: [
          new EmbedBuilder()
            
            .setDescription(
              `You must have \`Administrator\` permissions to run this command.`,
            ),
        ],
      }));
    }

    // Check if the welcomer module is enabled.
    if (!settings.welcome?.enabled) {
      return message.reply(v2({
        embeds: [
          new EmbedBuilder()
            
            .setDescription(
              `The welcomer module for this server is already disabled.`,
            ),
        ],
      }));
    }

    // Validate the provided arguments.
    const option = args[0]?.toLowerCase();
    if (!option) {
      return message.reply(v2({
        embeds: [
          new EmbedBuilder()
            
            .setDescription(
              `You must provide the required arguments.\nOptions: \`autodel\`, \`color\`, \`description\`, \`thumbnail\`, \`title\`, \`image\`, \`footer\`, \`all\``,
            ),
        ],
      }));
    }

    // If the 'all' option is selected, reset the settings.
    if (option === "all") {
      await resetSettings(settings); // Call the resetSettings function.
      return message.reply(v2({
        embeds: [
          new EmbedBuilder()
            
            .setDescription(
              `${client.emoji.tick} | Successfully reset the welcomer module for this server.`,
            ),
        ],
      }));
    }

    // Handle individual reset options
    else if (option === "image") {
      settings.welcome.embed.image = null;
      await settings.save();
      return message.reply(v2({
        embeds: [
          new EmbedBuilder()
            
            .setDescription(
              `${client.emoji.tick} | Successfully reset the image setting.`,
            ),
        ],
      }));
    } else if (option === "thumbnail") {
      settings.welcome.embed.thumbnail = false;
      await settings.save();
      return message.reply(v2({
        embeds: [
          new EmbedBuilder()
            
            .setDescription(
              `${client.emoji.tick} | Successfully reset the thumbnail setting.`,
            ),
        ],
      }));
    } else if (option === "title") {
      settings.welcome.embed.title = null;
      await settings.save();
      return message.reply(v2({
        embeds: [
          new EmbedBuilder()
            
            .setDescription(
              `${client.emoji.tick} | Successfully reset the title setting.`,
            ),
        ],
      }));
    } else if (option === "footer") {
      settings.welcome.embed.footer = null;
      await settings.save();
      return message.reply(v2({
        embeds: [
          new EmbedBuilder()
            
            .setDescription(
              `${client.emoji.tick} | Successfully reset the footer setting.`,
            ),
        ],
      }));
    } else if (option === "description") {
      settings.welcome.embed.description = null;
      await settings.save();
      return message.reply(v2({
        embeds: [
          new EmbedBuilder()
            
            .setDescription(
              `${client.emoji.tick} | Successfully reset the description setting.`,
            ),
        ],
      }));
    } else if (option === "color") {
      settings.welcome.embed.color = null;
      await settings.save();
      return message.reply(v2({
        embeds: [
          new EmbedBuilder()
            
            .setDescription(
              `${client.emoji.tick} | Successfully reset the color setting.`,
            ),
        ],
      }));
    } else if (option === "autodel") {
      settings.welcome.autodel = 0;
      await settings.save();
      return message.reply(v2({
        embeds: [
          new EmbedBuilder()
            
            .setDescription(
              `${client.emoji.tick} | Successfully reset the auto-delete setting.`,
            ),
        ],
      }));
    } else {
      return message.reply(v2({
        embeds: [
          new EmbedBuilder()
            
            .setDescription(
              `Invalid option provided. Please use one of the following options: \`image\`, \`thumbnail\`, \`title\`, \`footer\`, \`description\`, \`color\`, \`autodel\`, or \`all\`.`,
            ),
        ],
      }));
    }
  },
};

// Function to reset all settings
async function resetSettings(settings) {
  settings.welcome = {
    enabled: false,
    channel: null,
    content: null,
    autodel: 0,
    embed: {
      enabled: false,
      image: null,
      description: null,
      color: null,
      title: null,
      thumbnail: false,
      footer: null,
    },
  };

  await settings.save(); // Ensure the changes are saved to the database.
}
