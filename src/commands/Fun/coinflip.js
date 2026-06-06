const { v2 } = require("../../utils/v2");

module.exports = {
  name: "coinflip",
  category: "Fun",
  aliases: ["coin", "flip"],
  description: "Flip a coin.",
  cooldown: 3,
  execute: async (message) => {
    const side = Math.random() < 0.5 ? "Heads" : "Tails";
    return message.reply(v2(`**Coin Flip**\n> ${side}`));
  },
};
