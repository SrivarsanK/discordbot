const { v2 } = require("../../utils/v2");
const {
  EmbedBuilder,
  MessageFlags,
  ButtonBuilder,
  ActionRowBuilder,
  ButtonStyle,
} = require("discord.js");

module.exports = {
  name: "achi",
  category: "Image",
  aliases: ["achivement"],
  cooldown: 3,
  description: "Gives you an achievment",
  args: false,
  usage: "",
  userPerms: [],
  owner: false,
  execute: async (message, args, client, prefix) => {
    const text = args.join("+");
    if (!text) {
      return message.reply(v2({
        embeds: [
          new EmbedBuilder()
            
            .setDescription("write text to run the cmd"),
        ],
      }));
    }
    const embed = new EmbedBuilder()
      .setTitle("MineCraft achievement!")
      
      .setImage(
        `https://minecraftskinstealer.com/achievement/12/Achievement%20Get!/${text}`,
      );

    message.channel.send(v2({ embeds: [embed] }));
  },
};
