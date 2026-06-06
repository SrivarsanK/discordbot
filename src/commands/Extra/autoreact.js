const { v2 } = require("../../utils/v2");
const AutoReact = require("../../schema/autoreact");

module.exports = {
  name: "autoreact",
  category: "Extra",
  description: "Add or remove automatic reactions to messages.",
  usage: "<add/remove/list> <keyword> <emoji>",
  userPerms: ["ManageMessages"],
  args: false,
  cooldown: 3,
  execute: async (message, args, client, prefix) => {
    const subCommand = args[0];
    if (!subCommand) {
        message.channel.send(v2({
        embeds: [
          new client.embed()
            .d(
              ` \`\`\`[] = Optional Argument\n<> = Required Argument\nDo NOT type these when using commands!)\`\`\`\n\n**Aliases:**\n\`\`[autoreact]\`\`\n**Usage:**\n\`\`add/remove/list\`\``,
            ),
        ],
      }));
    }

    if (subCommand === "add") {
      const keyword = args[1];
      const emoji = args[2];

      if (!keyword || !emoji)
        return message.reply(v2(`Usage: \`${prefix}autoreact add <keyword> <emoji>\``));

      await AutoReact.create({ guildId: message.guild.id, keyword, emoji });
      return message.reply(v2({
        embeds: [
          new client.embed().d(
            `Added autoreact for keyword **${keyword}** with emoji **${emoji}**`,
          ),
        ],
      }));
    }

    if (subCommand === "remove") {
      const keyword = args[1];

      if (!keyword)
        return message.reply(v2(`Usage: \`${prefix}autoreact remove <keyword> <emoji>\``));

      const result = await AutoReact.findOneAndDelete({
        guildId: message.guild.id,
        keyword,
      });
      if (!result) return message.reply(v2("No autoreact found for that keyword."));

      return message.reply(v2({
        embeds: [
          new client.embed().d(`Removed autoreact for keyword **${keyword}**`),
        ],
      }));
    }

    if (subCommand === "list") {
      const data = await AutoReact.find({ guildId: message.guild.id });

      if (data.length === 0)
        return message.reply(v2("No autoreacts set up for this server."));

      const list = data
        .map((entry) => `**${entry.keyword}** → ${entry.emoji}`)
        .join("\n");
      return message.reply(v2({
        embeds: [new client.embed().d(`**AutoReact List:**\n${list}`)],
      }));
    }
  },
};
