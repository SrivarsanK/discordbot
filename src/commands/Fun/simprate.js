/** @format */

const { v2 } = require("../../utils/v2");
const { EmbedBuilder } = require("discord.js");

module.exports = {
  name: "simprate",
  aliases: ["simp"],
  description: "simp",
  cooldown: 3,
  userPermissions: [],
  botPermissions: [],
  category: "Fun",
  execute: async (message, args, client, prefix) => {
    const member = message.mentions.members.first();
    const user = member?.user || message.author;

    const Result = Math.floor(Math.random() * 101);
    const embed = new EmbedBuilder()
      
      .setDescription(
        `**${user.username} Is ${Result}% Simp ${client.emoji.fun}**`,
      );

    message.channel.send(v2({ embeds: [embed] }));
  },
};
