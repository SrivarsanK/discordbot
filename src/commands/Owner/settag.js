const { v2 } = require("../../utils/v2");
/** @format
 * Premium Customisation — settag
 * Elite premium: set custom bot nickname in your server
 */

const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  MessageFlags,
} = require("discord.js");
const Premium = require("../../schema/premium");

module.exports = {
  name: "settag",
  category: "Config",
  aliases: ["botnick", "botname"],
  description: "Set a custom bot nickname in this server (Elite only).",
  args: true,
  usage: "<nickname>",
  userPerms: ["ManageNicknames"],
  botPerms: ["ChangeNickname"],
  cooldown: 10,
  execute: async (message, args, client, prefix) => {
    const guildPrem = await Premium.findOne({ id: message.guild.id, type: "guild" });
    const prem = guildPrem?.isActive() ? guildPrem : null;

    if (!prem || prem.tier !== "elite" || !prem.features.priorityPlay) {
      const container = new ContainerBuilder();
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `## 👑 Elite Feature\n\n` +
          `> Custom bot tags require **Elite** guild premium.\n` +
          `-# Upgrade at our support server!`
        )
      );
      return message.channel.send(v2({
        components: [container],
        flags: MessageFlags.IsComponentsV2,
      }));
    }

    const nick = args.join(" ").slice(0, 32);

    await message.guild.members.me.setNickname(nick).catch(() => null);
    prem.customTag = nick;
    await prem.save();

    const container = new ContainerBuilder();
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `## ✅ Bot Tag Updated\n\n` +
        `> Bot nickname set to **${nick}** in this server.\n` +
        `-# Use \`${prefix}settag reset\` to restore the default name.`
      )
    );
    return message.channel.send(v2({
      components: [container],
      flags: MessageFlags.IsComponentsV2,
    }));
  },
};
