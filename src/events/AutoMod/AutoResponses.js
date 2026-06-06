const { v2 } = require("../../utils/v2");
const arr = require("../../schema/ar");

module.exports = {
  name: "messageCreate",
  run: async (client, message) => {
    if (!message.guild || message.author.bot) return;

    try {
      // Fetch autoresponder data for the guild
      const ardata = await arr.findOne({ guildId: message.guild.id });
      if (!ardata || !ardata.autoresponses || ardata.autoresponses.length === 0)
        return;

      // Normalize the message content to lowercase
      const msg = message.content.toLowerCase();

      // Loop through all autoresponses and check for case-insensitive matches
      for (const { trigger, response } of ardata.autoresponses) {
        if (msg === trigger.toLowerCase()) {
          // Normalize the trigger to lowercase
          await message.channel.send(v2(response)); // Respond to the trigger
          break; // Stop further checks after a match
        }
      }
    } catch (error) {
      console.error(`Error handling autoresponder: ${error.message}`);
    }
  },
};
