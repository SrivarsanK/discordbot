const { v2 } = require("../../utils/v2");

const answers = [
  "Yes.",
  "No.",
  "Probably.",
  "Not today.",
  "Ask again later.",
  "Absolutely.",
  "I would not bet on it.",
  "The signs point to yes.",
  "Looks doubtful.",
  "Clean win.",
];

module.exports = {
  name: "8ball",
  category: "Fun",
  aliases: ["ask"],
  description: "Ask the magic 8-ball a question.",
  usage: "<question>",
  args: true,
  cooldown: 3,
  execute: async (message, args) => {
    const question = args.join(" ");
    const answer = answers[Math.floor(Math.random() * answers.length)];
    return message.reply(v2(`**Question**\n> ${question}\n\n**Answer**\n> ${answer}`));
  },
};
