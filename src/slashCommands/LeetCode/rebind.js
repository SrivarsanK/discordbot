/** @format */

const { ApplicationCommandOptionType } = require("discord.js");
const LeetcodeUsers = require("../../schema/leetcodeUsers");
const registerCommand = require("./register");

module.exports = {
  name: "rebind",
  description: "Link a different LeetCode account (clears old binding)",
  options: [
    {
      name: "username",
      description: "Your new LeetCode username",
      type: ApplicationCommandOptionType.String,
      required: true,
    }
  ],

  run: async (client, interaction) => {
    // 1. Delete existing permanent link if any
    await LeetcodeUsers.deleteOne({ discordId: interaction.user.id });

    // 2. Delegate directly to the register command run logic
    return registerCommand.run(client, interaction);
  },
};
