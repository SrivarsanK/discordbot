const { v2 } = require("../../utils/v2");
const { EmbedBuilder } = require("discord.js");
const { default: axios } = require("axios");

module.exports = {
  name: "lick",
  description: "Lick someone",
  category: "Fun",
  cooldown: 3,
  guildOnly: false,
  ownerOnly: false,
  toggleOff: false,
  nsfwOnly: false,
  maintenance: false,
  botPerms: "",
  userPerms: "",
  execute: async (message, args, client, prefix) => {
    const user = message.mentions.users.first();
    if (!user) {
      return message.reply(v2({
        embeds: [
          new EmbedBuilder()
            
            .setDescription(`Please mention a user to lick.`),
        ],
      }));
    }
    if (user.id === message.author.id) {
      return message.reply(v2({
        embeds: [
          new EmbedBuilder()
            
            .setDescription(`You can't lick yourself.`),
        ],
      }));
    }
    const response = await axios.get("https://api.waifu.pics/sfw/lick");
    const image = response.data.url;
    const embed = new EmbedBuilder()
      
      .setDescription(`${message.author} Licks ${user}`)
      .setImage(image)
      .setTimestamp();
    message.channel.send(v2({ embeds: [embed] }));
  },
};
