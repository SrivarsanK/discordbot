const { v2 } = require("../../utils/v2");
const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags } = require("discord.js");
const db = require("../../schema/prefix.js");

module.exports = {
  name: "setprefix",
  category: "Config",
  description: "Sets a custom prefix.",
  args: false,
  usage: "<new_prefix>",
  aliases: ["prefix"],
  botPrams: ["EMBED_LINKS"],
  userPerms: ["ManageGuild"],
  owner: false,
  cooldown: 3,
  execute: async (message, args, client, prefix) => {
    const newPrefix = args.join(" ");
    const container = new ContainerBuilder();

    if (!newPrefix) {
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `## ❌ Prefix Configuration Error\n` +
          `-# Please provide a new prefix.`
        )
      );
      container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `> **Usage:** \`${prefix}setprefix <new_prefix>\`\n` +
          `> **Example:** \`${prefix}setprefix ?\``
        )
      );

      return message.reply(v2({
        components: [container],
        flags: MessageFlags.IsComponentsV2,
      }));
    }

    if (newPrefix.length > 5) {
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `## ❌ Prefix Length Error\n` +
          `-# The requested prefix is too long.`
        )
      );
      container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `> Prefix cannot exceed **5 characters** in length.`
        )
      );

      return message.reply(v2({
        components: [container],
        flags: MessageFlags.IsComponentsV2,
      }));
    }

    const data = await db.findOne({ Guild: message.guildId });
    const oldPrefix = data?.prefix || data?.Prefix || client.prefix;

    if (!data) {
      const newData = new db({
        guildId: message.guildId,
        prefix: newPrefix,
        oldPrefix: oldPrefix,
      });
      await newData.save();
    } else {
      data.oldPrefix = oldPrefix;
      data.prefix = newPrefix;
      await data.save();
    }

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `## 🔑 Prefix Updated\n` +
        `-# Server prefix has been changed successfully.`
      )
    );
    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `> **Old Prefix:** \`${oldPrefix}\`\n` +
        `> **New Prefix:** \`${newPrefix}\` (use this prefix from now on)`
      )
    );

    return message.reply(v2({
      components: [container],
      flags: MessageFlags.IsComponentsV2,
    }));
  },
};
