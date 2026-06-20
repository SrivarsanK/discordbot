/** @format */

const LeetcodeUsers = require("../../schema/leetcodeUsers");
const registerCommand = require("./register");

module.exports = {
  name: "rebind",
  category: "LeetCode",
  aliases: ["lcrebind"],
  cooldown: 5,
  description: "Link a different LeetCode account (clears old binding)",
  args: true,
  usage: "<leetcode_username>",
  userPerms: [],
  botPerms: [],
  owner: false,

  execute: async (message, args, client) => {
    // 1. Delete existing permanent link if any
    await LeetcodeUsers.deleteOne({ discordId: message.author.id });

    // 2. Delegate directly to the register command logic to initiate new linking
    return registerCommand.execute(message, args, client);
  },
};
