const AutoReact = require("../../schema/autoreact");

module.exports = {
  name: "messageCreate",
  run: async (client, message) => {
    if (message.author.bot || !message.guild) return;

    const reactions = await AutoReact.find({ guildId: message.guild.id });

    for (const react of reactions) {
      if (message.content.includes(react.keyword)) {
        message.react(react.emoji).catch(() => null);
      }
    }
  },
};
