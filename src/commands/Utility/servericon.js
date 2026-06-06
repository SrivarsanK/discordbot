const { v2 } = require("../../utils/v2");
const {
  EmbedBuilder,
  MessageFlags,
  ButtonBuilder,
  ActionRowBuilder,
  ButtonStyle,
} = require("discord.js");

module.exports = {
  name: "servericon",
  category: "Utility",
  cooldown: 3,
  aliases: ["sicon", "svricon"],
  description: "to show server icon",
  args: false,
  usage: "",
  userPerms: [],
  owner: false,
  execute: async (message, args, client, prefix) => {
    if (message.guild.iconURL()) {
      const embed = new EmbedBuilder()
        
        .setImage(message.guild.iconURL({ dynamic: true, size: 2048 }))
        .setFooter({
          text: `Requested by ` + message.author.tag,
          iconURL: message.author.displayAvatarURL(),
        });
      const row = new ActionRowBuilder().addComponents([
        new ButtonBuilder()
          .setLabel("PNG")
          .setStyle(ButtonStyle.Link)
          .setURL(
            message.guild.iconURL({
              dynamic: true,
              size: 2048,
              extension: "png",
            }),
          ),

        new ButtonBuilder()
          .setLabel("JPG")
          .setStyle(ButtonStyle.Link)
          .setURL(
            message.guild.iconURL({
              dynamic: true,
              size: 2048,
              extension: "jpg",
            }),
          ),
      ]);
      message.reply(v2({ embeds: [embed], components: [row] }));
    } else if (message.guild.iconURL() === null) {
      message.reply(v2("there is null server icon"));
    }
  },
};
