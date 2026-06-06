const { v2 } = require("../../utils/v2");
const {
  EmbedBuilder,
  MessageFlags,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const { getInviteUrl } = require("../../utils/botMeta");

module.exports = {
  name: "invite",
  category: "Information",
  aliases: ["addme", "inv"],
  description: "Get the bot's invite link.",
  botPrams: ["EMBED_LINKS"],
  args: false,
  usage: "",
  userPerms: [],
  owner: false,
  cooldown: 3,
  execute: async (message, args, client, prefix) => {
    const inviteUrl = getInviteUrl(client);
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel("Invite")
        .setStyle(ButtonStyle.Link)
        .setURL(inviteUrl),
    );

    const mainPage = new EmbedBuilder()
      .setAuthor({
        name: client.user.username,
        iconURL: client.user.displayAvatarURL(),
      })
      .setFooter({
        text: `Requested by ` + message.author.username,
        iconURL: message.author.displayAvatarURL(),
      })
      .setDescription(
        `**Invite ${client.user.username}**\n**[Here](${inviteUrl})**`,
      )
      .setThumbnail(client.user.displayAvatarURL())
      ;
    message.reply(v2({ embeds: [mainPage], components: [row] }));
  },
};

//
