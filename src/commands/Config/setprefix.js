const { v2 } = require("../../utils/v2");
const { EmbedBuilder } = require("discord.js");
const db = require("../../schema/prefix.js");

module.exports = {
  name: "setprefix",
  category: "Config",
  description: "Sets a custom prefix.",
  args: false,
  usage: "",
  aliases: ["prefix"],
  botPrams: ["EMBED_LINKS"],
  userPerms: ["ManageGuild"],
  owner: false,
  cooldown: 3,
  execute: async (message, args, client, prefix) => {
    const data = await db.findOne({ Guild: message.guildId });
    const newPrefix = args.join(" ");

    if (!newPrefix) {
      return message.reply(v2({
        embeds: [
          new EmbedBuilder()
            .setDescription(`${client.emoji.cross} | Provide a new prefix`)
            ,
        ],
      }));
    }

    if (newPrefix.length > 3) {
      return message.reply(v2({
        embeds: [
          new EmbedBuilder()
            .setAuthor({
              name: `Prefix can't exceed 3 characters!`,
              iconURL: message.author.displayAvatarURL(),
            })
            ,
        ],
      }));
    }

    if (!data) {
      const newData = new db({
        Guild: message.guildId,
        Prefix: newPrefix,
        oldPrefix: prefix,
      });
      await newData.save();
    } else {
      data.oldPrefix = prefix;
      data.Prefix = newPrefix;
      try {
        await data.save();
      } catch (err) {
        console.error(err);
        return message.reply(v2({
          embeds: [
            new EmbedBuilder()
              .setDescription(
                `An error occurred while updating the prefix: ${err.message}`,
              )
              ,
          ],
        }));
      }
    }

    return message.reply(v2({
      embeds: [
        new EmbedBuilder()
          .setDescription(`Prefix updated to: ${newPrefix}`)
          ,
      ],
    }));
  },
};
