const { v2 } = require("../../utils/v2");
const {
  EmbedBuilder,
} = require("discord.js");

module.exports = {
  name: "support",
  category: "Information",
  aliases: [],
  description: "Gives you the link of our support server",
  args: false,
  usage: "",
  userPrams: [],
  botPrams: ["EMBED_LINKS"],
  owner: false,
  cooldown: 3,
  execute: async (message, args, client, prefix) => {
    const embed = new EmbedBuilder()
      .setDescription("Support link is not configured.")
      ;
    await message.reply(v2({ embeds: [embed] }));
  },
};
