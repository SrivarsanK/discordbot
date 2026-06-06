const { v2 } = require("../../utils/v2");
const { EmbedBuilder } = require("discord.js");
const { getSettings } = require("../../schema/welcomesystem");

module.exports = {
  name: "welcome",
  category: "Welcome",
  aliases: ["setwlc", "setwelcome"],
  description: "",
  args: false,
  usage: "",
  userPerms: ["Administrator"],
  owner: false,
  execute: async (message, args, client, prefix) => {
    // Fetch settings for the guild
    const settings = await getSettings(message.guild);
    if (!settings) {
      return message.reply(v2({
        embeds: [
          new EmbedBuilder()
            
            .setDescription("Settings not configured for this server."),
        ],
      }));
    }

    // Check if the user has Administrator permissions
    if (!message.member.permissions.has("Administrator")) {
      return message.reply(v2({
        embeds: [
          new EmbedBuilder()
            
            .setDescription(
              "You must have `Administrator` permissions to run this command.",
            ),
        ],
      }));
    }

    // Get status argument (ON/OFF)
    const status = args[0]?.toUpperCase();
    if (!status) {
      const embed = new EmbedBuilder()
        
        .setDescription(
          `${prefix}welcome <on/off>\nToggles the welcomer system for this server.\n\n` +
            `${prefix}welcomechannel <#channelId>\nToggles the channel where the welcome message will be sent.\n\n` +
            `${prefix}welcomemessage autodel\nSets the autodel values according to your choice.\n\n` +
            `${prefix}welcomemessage color\nSets the color values according to your choice.\n\n` +
            `${prefix}welcomemessage thumbnail\nSets the thumbnail values according to your choice.\n\n` +
            `${prefix}welcomemessage description\nSets the description values according to your choice.\n\n` +
            `${prefix}welcomemessage title\nSets the title values according to your choice.\n\n` +
            `${prefix}welcometest\nTest the welcome message to see how it will look.`,
        )

        .setFooter({
          text: `Requested by ` + message.author.tag,
          iconURL: message.author.displayAvatarURL(),
        });
      return message.reply(v2({ embeds: [embed] }));
    }

    // Check if status is valid
    if (!["ON", "OFF"].includes(status)) {
      return message.reply(v2({
        embeds: [
          new EmbedBuilder()
            
            .setDescription(
              "You didn't provide a valid status for welcome.\nStatus: `on`, `off`",
            ),
        ],
      }));
    }

    // Call setStatus to update the welcome status
    try {
      const response = await client.util.setStatus(settings, status);
      return message.reply(v2({
        embeds: [
          new EmbedBuilder().setDescription(response),
        ],
      }));
    } catch (error) {
      console.error("Error calling setStatus:", error);
      return message.reply(v2({
        embeds: [
          new EmbedBuilder()
            
            .setDescription(
              "An error occurred while trying to update the welcome status.",
            ),
        ],
      }));
    }
  },
};
