const { v2 } = require("../../utils/v2");
const { EmbedBuilder } = require("discord.js");
const { getSettings } = require("../../schema/welcomesystem");

module.exports = {
  name: "welcomemessage",
  category: "Welcome",
  aliases: ["welcomemsg", "wclymsg"],
  description: "Configure the welcome message system.",
  args: false,
  usage: "<option> <value>",
  userPerms: ["Administrator"],
  owner: false,
  execute: async (message, args, client, prefix) => {
    const settings = await getSettings(message.guild);

    if (!message.member.permissions.has("Administrator")) {
      return message.reply(v2({
        embeds: [
          new EmbedBuilder()
            
            .setDescription(
              `${client.emoji.cross} | You must have \`Administrator\` permissions to use this command.`,
            ),
        ],
      }));
    }

    if (!args[0]) {
      return message.reply(v2({
        embeds: [
          new EmbedBuilder()
            
            .setTitle("Welcome Message Configuration")
            .setDescription(
              `You need to provide an option and value to configure the welcome message.\n\n**Options:**\n\`embed\`, \`autodel\`, \`color\`, \`description\`, \`thumbnail\`, \`title\`, \`image\`\n\n**Example:**\n\`${prefix}welcomemessage embed on\``,
            ),
        ],
      }));
    }

    const option = args[0].toLowerCase();
    const value = args.slice(1).join(" ");
    let response;

    // Handle each option
    switch (option) {
      case "embed": {
        const enabled = ["on", "enable", "enabled", "true", "yes"].includes(value.toLowerCase());
        const disabled = ["off", "disable", "disabled", "false", "no"].includes(value.toLowerCase());
        if (!enabled && !disabled) {
          return message.reply(v2({ content: `Use \`${prefix}welcomemessage embed on\` or \`${prefix}welcomemessage embed off\`.` }));
        }
        settings.welcome.embed.enabled = enabled;
        await settings.save();
        response = `✅ | Welcome embed is now **${enabled ? "enabled" : "disabled"}**.`;
        break;
      }

      case "autodel": {
        const time = Math.round(value);
        if (isNaN(time) || time < 0 || time > 30) {
          return message.reply(v2({
            embeds: [
              new EmbedBuilder()
                
                .setDescription(
                  `${client.emoji.cross} | Please provide a valid time in seconds (0-30) for auto-deletion.\n\n**Example:**\n\`${prefix}welcomemessage autodel 10\``,
                ),
            ],
          }));
        }
        settings.welcome.autodel = time;
        await settings.save();
        response = `✅ | Updated auto-delete time to \`${time}s\`.`;
        break;
      }

      case "color": {
        if (!client.util.isHex(value)) {
          return message.reply(v2({
            embeds: [
              new EmbedBuilder()
                
                .setDescription(
                  `${client.emoji.cross} | Please provide a valid hex color code.\n\n**Example:**\n\`${prefix}welcomemessage color #1abc9c\``,
                ),
            ],
          }));
        }
        settings.welcome.embed.enabled = true;
        settings.welcome.embed.color = value;
        await settings.save();
        response = `✅ | Updated embed color to \`${value}\`.`;
        break;
      }

      case "description": {
        if (!value) {
          return message.reply(v2({
            embeds: [
              new EmbedBuilder()
                
                .setTitle("Description Variables")
                .setDescription(
                  `\`{server_name}\` - Server Name\n` +
                    `\`{server_id}\` - Server ID\n` +
                    `\`{server_icon}\` - Server Icon URL\n` +
                    `\`{server_ownerId}\` - Server Owner's ID\n` +
                    `\`{server_owner}\` - Mention Server Owner\n` +
                    `\`{server_memberCount}\` - Server Member Count\n` +
                    `\`{user_display}\` - User's Display Name\n` +
                    `\`{user_avatar}\` - User's Avatar URL\n` +
                    `\`{user_name}\` - User's Username\n` +
                    `\`{user}\` - Mention User\n` +
                    `\`{user_id}\` - User's ID\n` +
                    `\`{user_created:at}\` - Account Creation Timestamp`,
                ),
            ],
          }));
        }
        response = await client.util.setDescription(settings, value);
        break;
      }

      case "thumbnail": {
        if (!value) {
          return message.reply(v2({
            embeds: [
              new EmbedBuilder()
                
                .setDescription(
                  `${client.emoji.cross} | Please provide a valid thumbnail URL.\n\n**Example:**\n\`${prefix}welcomemessage thumbnail <url>\``,
                ),
            ],
          }));
        }
        response = await client.util.setThumbnail(settings, value);
        break;
      }

      case "title": {
        if (!value) {
          return message.reply(v2({
            embeds: [
              new EmbedBuilder()
                
                .setDescription(
                  `${client.emoji.cross} | Please provide a title for the embed.\n\n**Example:**\n\`${prefix}welcomemessage title Welcome to {server_name}!\``,
                ),
            ],
          }));
        }
        response = await client.util.setTitle(settings, value);
        break;
      }

      case "image": {
        if (!value) {
          return message.reply(v2({
            embeds: [
              new EmbedBuilder()
                
                .setDescription(
                  `${client.emoji.cross} | Please provide a valid image URL.\n\n**Example:**\n\`${prefix}welcomemessage image <url>\``,
                ),
            ],
          }));
        }
        response = await client.util.setImage(settings, value);
        break;
      }

      default:
        return message.reply(v2({
          embeds: [
            new EmbedBuilder()
              
              .setDescription(
                `${client.emoji.cross} | Invalid option. Please choose from the following:\n\`autodel\`, \`color\`, \`description\`, \`thumbnail\`, \`title\`, \`image\`\n\n**Example:**\n\`${prefix}welcomemessage color #ff0000\``,
              ),
          ],
        }));
    }

    // Send confirmation
    return message.reply(v2({
      embeds: [
        new EmbedBuilder()
          
          .setDescription(
            response || "Something went wrong while updating the settings.",
          ),
      ],
    }));
  },
};
