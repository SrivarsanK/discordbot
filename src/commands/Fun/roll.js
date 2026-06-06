const { v2 } = require("../../utils/v2");

module.exports = {
  name: "roll",
  category: "Fun",
  aliases: ["dice"],
  description: "Roll dice. Example: roll 2d20",
  usage: "[dice]",
  cooldown: 3,
  execute: async (message, args) => {
    const input = args[0] || "1d6";
    const match = input.match(/^(\d{1,2})d(\d{1,3})$/i);
    if (!match) return message.reply(v2("Use dice format like `1d6`, `2d20`, or `4d10`."));

    const count = Math.min(20, Math.max(1, Number(match[1])));
    const sides = Math.min(200, Math.max(2, Number(match[2])));
    const rolls = Array.from({ length: count }, () => Math.floor(Math.random() * sides) + 1);
    const total = rolls.reduce((sum, roll) => sum + roll, 0);

    return message.reply(
      v2(
        `**Dice Roll** \`${count}d${sides}\`\n` +
          `> Rolls: ${rolls.map((roll) => `\`${roll}\``).join(" ")}\n` +
          `> Total: **${total}**`,
      ),
    );
  },
};
