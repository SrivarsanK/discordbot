const { v2 } = require("../../utils/v2");
const {
  EmbedBuilder,
  MessageFlags,
  ButtonBuilder,
  ActionRowBuilder,
  ButtonStyle,
} = require("discord.js");
const { getSettings } = require("../../schema/welcomesystem");
module.exports = {
  name: "welcometest",
  category: "Welcome",
  aliases: ["welc-test"],
  description: "",
  args: false,
  usage: "",
  userPerms: ["ManageGuild"],
  owner: false,
  execute: async (message, args, client, prefix) => {
    const settings = await getSettings(message.guild);
    if (!message.member.permissions.has("ManageGuild")) {
      return message.reply(v2({
        embeds: [
          new EmbedBuilder()
            
            .setDescription(
              `You must have \`Administration\` perms to run this command.`,
            ),
        ],
      }));
    }
    const response = await client.util.sendPreview(settings, message.member);
    return message.reply(v2({
      embeds: [
        new EmbedBuilder().setDescription(response),
      ],
    }));
  },
};
