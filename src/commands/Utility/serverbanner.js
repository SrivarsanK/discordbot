const { v2 } = require("../../utils/v2");
const {
  EmbedBuilder,
  MessageFlags,
  ButtonBuilder,
  ActionRowBuilder,
  ButtonStyle,
} = require("discord.js");

module.exports = {
  name: "serverbanner",
  category: "Utility",
  cooldown: 3,
  aliases: ["sbanner", "svbanner"],
  description: "to see server banner",
  args: false,
  usage: "",
  userPerms: [],
  owner: false,
  execute: async (message, args, client, prefix) => {
    if (message.guild.banner) {
      const embed = new EmbedBuilder()
        .setTitle(`${message.guild.name}'s Banner!`)
        
        .setFooter({
          text: `Requested by` + message.author.tag,
          iconURL: message.author.displayAvatarURL(),
        })
        .setImage(message.guild.bannerURL({ size: 4096 }));
      message.reply(v2({ embeds: [embed] }));
    } else {
      const embed = new EmbedBuilder()
        .setDescription(`This Server has no Banner!`)
        ;
      message.reply(v2({ embeds: [embed] }));
    }
  },
};
