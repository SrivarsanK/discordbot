const { v2 } = require("../../utils/v2");
const {
  EmbedBuilder,
  MessageFlags,
  ButtonBuilder,
  ActionRowBuilder,
  ButtonStyle,
} = require("discord.js");

module.exports = {
  name: "unbanall",
  category: "Moderation",
  aliases: ["unbanallmember"],
  cooldown: 3,
  description: "to unban all user from a server",
  args: false,
  usage: "",
  userPerms: ["BanMembers"],
  botPerms: ["BanMembers"],
  owner: false,
  execute: async (message, args, client, prefix) => {
    if (!message.member.permissions.has("BanMembers")) {
      message.reply(
        v2(`${client.emoji.cross} You don't have the permissions to unban all`),
      );
      return;
    }
    try {
      let banned = 0;
      message.guild.bans.fetch().then((bans) => {
        if (bans.size == 0) {
          const embed = new client.embed()
            .d(`${client.emoji.cross} ! There are no banned users.`)
            .setFooter({
              text: "Requested by " + message.author.username,
              iconURL: message.author.displayAvatarURL(),
            });
          message.reply(v2({ embeds: [embed] }));
        } else {
          bans.forEach((ban) => {
            message.guild.members.unban(ban.user.id);
            banned++;
          });

          const wifey = new client.embed().d(
            `${client.emoji.loading} ** Unbaning all ${banned} members **`,
          );
          message.reply(v2({ embeds: [wifey] }));
        }
      });
    } catch (err) {
      message.reply(v2({ embeds: [new client.embed().d(`${err}`)] }));
    }
  },
};
