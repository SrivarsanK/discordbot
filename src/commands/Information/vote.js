const { v2 } = require("../../utils/v2");
const {
    ButtonBuilder,
  ActionRowBuilder,
} = require("discord.js");
const { getVoteUrl } = require("../../utils/botMeta");

module.exports = {
  name: "vote",
  aliases: ["vote"],
  description: "Vote for the bot",
  args: false,
  botPrams: ["EMBED_LINKS"],
  userPerms: [],
  owner: false,
  category: "Information",
  cooldown: 3,
  execute: async (message, args, client, prefix) => {
    const button = new ButtonBuilder()
      .setLabel("Vote")
      .setStyle("Link")
      .setURL(getVoteUrl(client));
    const row = new ActionRowBuilder().addComponents(button);
    message.reply(v2({components: [row] }));
  },
};
