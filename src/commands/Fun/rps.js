const { v2 } = require("../../utils/v2");

const choices = ["rock", "paper", "scissors"];
const beats = {
  rock: "scissors",
  paper: "rock",
  scissors: "paper",
};

module.exports = {
  name: "rps",
  category: "Fun",
  aliases: ["rockpaperscissors"],
  description: "Play rock paper scissors.",
  usage: "<rock|paper|scissors>",
  args: true,
  cooldown: 3,
  execute: async (message, args) => {
    const user = args[0]?.toLowerCase();
    if (!choices.includes(user)) {
      return message.reply(v2("Choose `rock`, `paper`, or `scissors`."));
    }

    const bot = choices[Math.floor(Math.random() * choices.length)];
    const result = user === bot ? "Draw." : beats[user] === bot ? "You win." : "I win.";
    return message.reply(
      v2(`**Rock Paper Scissors**\n> You picked: \`${user}\`\n> I picked: \`${bot}\`\n> **${result}**`),
    );
  },
};
