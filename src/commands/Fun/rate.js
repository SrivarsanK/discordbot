const { v2 } = require("../../utils/v2");

module.exports = {
  name: "rate",
  category: "Fun",
  aliases: ["ratewa", "score"],
  description: "Rate anything from 0 to 100.",
  usage: "<thing>",
  args: true,
  cooldown: 3,
  execute: async (message, args) => {
    const target = args.join(" ");
    const seed = [...target.toLowerCase()].reduce((sum, char) => sum + char.charCodeAt(0), 0);
    const rating = (seed * 37 + Number(message.author.id.slice(-4))) % 101;
    return message.reply(v2(`**Rating**\n> ${target}: **${rating}/100**`));
  },
};
