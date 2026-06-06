const { v2 } = require("../../utils/v2");
const {
  EmbedBuilder,
  MessageFlags,
  ButtonBuilder,
  ActionRowBuilder,
  ButtonStyle,
} = require("discord.js");

module.exports = {
  name: "unhide",
  category: "Moderation",
  aliases: ["unhidechannel"],
  cooldown: 3,
  description: "to unhide channels",
  args: false,
  usage: "",
  userPerms: ["ManageChannels"],
  botPerms: ["ManageChannels"],
  owner: false,
  execute: async (message, args, client, prefix) => {
    if (!message.member.permissions.has("ManageChannels")) {
      const error = new EmbedBuilder()
        
        .setDescription(
          `You must have \`Manage Channels\` permission to use this command.`,
        );
      return message.reply(v2({ embeds: [error] }));
    }
    const channelss =
      message.mentions.channels.first() ||
      message.guild.channels.cache.get(args[0]) ||
      message.channel;

    if (channelss.manageable) {
      channelss.permissionOverwrites.edit(v2(message.guild.roles.everyone), {
        ViewChannel: true,
        reason: `${message.author.tag}`,
      });
      const emb = new EmbedBuilder()
        .setDescription(`${channelss} has been unhidden for @everyone role`)
        ;
      return message.channel.send(v2({ embeds: [emb] }));
    } else {
      const embi = new EmbedBuilder()
        .setDescription(
          `I don't have adequate permissions to hide this channel.`,
        )
        ;
      return message.channel.send(v2({ embeds: [embi] }));
    }
  },
};
