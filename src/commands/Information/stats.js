/** @format */

const { v2 } = require("../../utils/v2");

const { EmbedBuilder, version } = require("discord.js");
const { getFooterText } = require("../../utils/botMeta");

module.exports = {
  name: "stats",
  category: "Information",
  aliases: ["status", "botinfo", "bi"],
  description: "Displays bot stats.",
  botPrams: ["EmbedLinks"],
  args: false,
  usage: "",
  userPerms: [],
  owner: false,
  cooldown: 3,
  execute: async (message, args, client) => {
    const uptime = Math.round((Date.now() - message.client.uptime) / 1000);
    const userCount = client.guilds.cache.reduce(
      (acc, guild) => acc + guild.memberCount,
      0,
    );

    const embed = new EmbedBuilder()
      
      .setAuthor({
        name: `${client.user.username} Stats`,
        iconURL: client.user.displayAvatarURL(),
      })
      .setDescription(
        `**Servers:** ${client.guilds.cache.size}\n` +
          `**Channels:** ${client.channels.cache.size}\n` +
          `**Users:** ${client.numb(userCount)}\n` +
          `**Commands:** ${client.commands.size}\n` +
          `**Discord.js:** v${version}\n` +
          `**Ping:** ${client.ws.ping}ms\n` +
          `**Uptime:** <t:${uptime}:R>\n\n` +
          `Modified by SrivarsanK.`,
      )
      .setFooter({
        text: getFooterText(client),
        iconURL: message.author.displayAvatarURL({ dynamic: true }),
      });

    return message.reply(v2({ embeds: [embed] }));
  },
};
