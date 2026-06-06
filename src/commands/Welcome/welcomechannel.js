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
  name: "welcomechannel",
  category: "Welcome",
  aliases: ["setwelc-channel"],
  description: "",
  args: false,
  usage: "",
  userPerms: ["Administrator"],
  owner: false,
  execute: async (message, args, client, prefix) => {
    const settings = await getSettings(message.guild);
    if (!message.member.permissions.has("Administrator")) {
      return message.reply(v2({
        embeds: [
          new EmbedBuilder()
            
            .setDescription(
              `You must have \`Administration\` perms to run this command.`,
            ),
        ],
      }));
    }

    if (
      !message.mentions.channels.first() ||
      message.guild.channels.cache.get(args[0])
    ) {
      return message.reply(v2({
        embeds: [
          new EmbedBuilder()
            
            .setDescription(
              `You didn't mentioned the channel to set as welcome channel.`,
            ),
        ],
      }));
    }
    const response = await client.util.setChannel(
      settings,
      message.mentions.channels.first() ||
        message.guild.channels.cache.get(args[0]),
    );
    return message.reply(v2({
      embeds: [
        new EmbedBuilder().setDescription(response),
      ],
    }));
  },
};
