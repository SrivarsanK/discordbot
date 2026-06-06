const { EmbedBuilder } = require("discord.js");
const { v2 } = require("../../utils/v2");

module.exports = {
  name: "cat",
  category: "Image",
  aliases: ["cat", "pat"],
  cooldown: 3,
  description: "Sends a random cat image",
  args: false,
  usage: "",
  userPerms: [],
  owner: false,
  execute: async (message, args, client) => {
    try {
      const response = await fetch("https://api.thecatapi.com/v1/images/search");
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      const image = data?.[0]?.url;
      if (!image) {
        return message.channel.send(v2(`${client.emoji.cross} | Could not get a cat image right now.`));
      }

      const embed = new EmbedBuilder()
        .setTitle("Cat")
        .setImage(image)
        .setFooter({
          text: `Requested by ${message.author.tag}`,
          iconURL: message.author.displayAvatarURL({ dynamic: true }),
        });

      return message.channel.send(v2({ embeds: [embed] }));
    } catch (error) {
      client.logger?.log(`[Cat] Fetch error: ${error.stack || error}`, "warn");
      return message.channel.send(v2(`${client.emoji.cross} | Couldn't fetch a cat image at the moment.`));
    }
  },
};
