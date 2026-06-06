const { v2 } = require("../../utils/v2");
const {
  EmbedBuilder,
  MessageFlags,
  ButtonBuilder,
  ActionRowBuilder,
  ButtonStyle,
} = require("discord.js");

module.exports = {
  name: "howdumb",
  category: "Fun",
  aliases: ["dumb"],
  cooldown: 3,
  description: "Sends you your dumb rate",
  args: false,
  usage: "dumbrate [user]",
  userPerms: [],
  owner: false,
  execute: async (message, args, client, prefix) => {
    const User = message.mentions.members.first();
    const gayrate = Math.floor(Math.random() * 101);
    if (!User) {
      return message.reply(v2({
        embeds: [
          new EmbedBuilder()
            
            .setDescription(`___Please mention a user to check dumb rate!___`),
        ],
      }));
    }

    if (User.id === client.config.app?.protectedUserId) {
      const owner = new EmbedBuilder()
        
        .setDescription(`He is not dumb like u`);
      message.reply(v2({ embeds: [owner] }));
    } else if (User) {
      const Dumbdalle = new EmbedBuilder()
        
        .setDescription(
          `**${User} is ${gayrate}% dumb! ${client.emoji.fun}**`,
        );

      message.channel.send(v2({ embeds: [Dumbdalle] }));
    }
  },
};
