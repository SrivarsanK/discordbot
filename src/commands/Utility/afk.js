const { v2 } = require("../../utils/v2");
const { EmbedBuilder } = require("discord.js");
const db = require("../../schema/afk");

module.exports = {
  name: "afk",
  category: "Utility",
  aliases: ["busy"],
  cooldown: 3,
  description: "Set AFK status for the user",
  args: false,
  usage: "",
  userPerms: [],
  botPerms: [],
  owner: false,

  execute: async (message, args, client) => {
    const reason = args.join(" ") || "I'm AFK :)";

    const me = await db.create({
      Guild: message.guildId,
      Member: message.author.id,
      Reason: reason,
      Time: Date.now(),
    });

    // if (me) return message.reply(v2(`ur afk already`));
    message.channel.send(v2({
      embeds: [
        new EmbedBuilder()
          .setDescription(`Your AFK is now set to: **${reason}**`)
          ,
      ],
    }));
  },
};
