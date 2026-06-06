const { v2 } = require("../../utils/v2");
const { EmbedBuilder, MessageFlags, AttachmentBuilder } = require("discord.js");
const { default: axios } = require("axios");

module.exports = {
  name: "hug",
  description: "Hug someone",
  category: "Image",
  cooldown: 3,
  botPermissions: ["SendMessages", "EmbedLinks"],
  userPermissions: [],
  execute: async (message, args, client, prefix) => {
    const user = message.mentions.users.first();
    if (!user) {
      return message.reply(v2({
        embeds: [
          new EmbedBuilder()
            
            .setDescription(`Please mention a user to hug.`),
        ],
      }));
    }
    if (user.id === message.author.id) {
      return message.reply(v2({
        embeds: [
          new EmbedBuilder()
            
            .setDescription(`You can't hug yourself.`),
        ],
      }));
    }
    const response = await axios.get("https://api.waifu.pics/sfw/hug");
    const image = response.data.url;
    const embed = new EmbedBuilder()
      
      .setDescription(`${message.author} Hugs ${user}`)
      .setImage(image)
      .setTimestamp();
    message.channel.send(v2({ embeds: [embed] }));
  },
};
