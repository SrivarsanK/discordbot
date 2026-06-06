const { v2 } = require("../../utils/v2");
const {
  EmbedBuilder,
  MessageFlags,
  ButtonBuilder,
  ActionRowBuilder,
  ButtonStyle,
} = require("discord.js");

module.exports = {
  name: "dog",
  category: "Image",
  aliases: ["kutta", "roke"],
  cooldown: 3,
  description: "",
  args: false,
  usage: "",
  userPerms: [],
  owner: false,
  execute: async (message, args, client, prefix) => {
    const res = await fetch("https://dog.ceo/api/breeds/image/random");
    const img = (await res.json()).message;
    const embed = new EmbedBuilder()
      .setTitle(`Dog`)
      .setImage(img)
      .setFooter({
        text: "Requested by " + message.author.username,
        iconURL: message.author.displayAvatarURL({ dynamic: true }),
      })
      ;
    message.channel.send(v2({ embeds: [embed] }));
  },
};
