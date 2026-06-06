const { v2 } = require("../../utils/v2");
const {
  EmbedBuilder,
  MessageFlags,
  ButtonBuilder,
  ActionRowBuilder,
  ButtonStyle,
} = require("discord.js");

module.exports = {
  name: "howgay",
  category: "Fun",
  aliases: ["gay"],
  cooldown: 3,
  description: "Shows How Member Gay Is!",
  args: false,
  usage: "howgay <Mention Member>",
  userPerms: [],
  owner: false,
  execute: async (message, args, client, prefix) => {
    const User = message.mentions.members.first();
    const gayrate = Math.floor(Math.random() * 101);
    if (!User) {
      return message.reply(v2({
        embeds: [
          new EmbedBuilder()
            
            .setDescription(`___Please mention a user to check gay rate!___`),
        ],
      }));
    }

    if (User.id === client.config.app?.protectedUserId) {
      const owner = new EmbedBuilder()
        
        .setDescription(`He is not gay like u`);
      message.reply(v2({ embeds: [owner] }));
    } else if (User) {
      const gaydalle = new EmbedBuilder()
        
        .setDescription(
          `**${User} is ${gayrate}% gay! ${client.emoji.fun}**`,
        );

      message.channel.send(v2({ embeds: [gaydalle] }));
    }
  },
};
