const { v2 } = require("../../utils/v2");
/** @format
 * Premium Customisation — setcolor
 * Lets premium guilds/users set a custom embed color
 */

const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  MessageFlags,
} = require("discord.js");
const Premium = require("../../schema/premium");

module.exports = {
  name: "setcolor",
  category: "Config",
  aliases: ["embedcolor", "color"],
  description: "Set a custom embed color (Premium only).",
  args: true,
  usage: "<hex color>",
  cooldown: 5,
  execute: async (message, args, client, prefix) => {
    // Check premium for user or guild
    const userPrem  = await Premium.findOne({ id: message.author.id,  type: "user"  });
    const guildPrem = await Premium.findOne({ id: message.guild.id,   type: "guild" });
    const prem = (userPrem?.isActive() && userPrem) || (guildPrem?.isActive() && guildPrem);

    if (!prem || !prem.features.customEmbed) {
      const container = new ContainerBuilder();
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `## 💎 Premium Feature\n\n` +
          `> Custom embed colors require **Pro** or **Elite** premium.\n` +
          `-# Contact a bot owner or visit our support server to upgrade.`
        )
      );
      return message.channel.send(v2({
        components: [container],
        flags: MessageFlags.IsComponentsV2,
      }));
    }

    const hex = args[0];
    if (!/^#([0-9A-Fa-f]{6})$/.test(hex)) {
      return message.reply(v2({
        content: `Invalid hex color. Use format: \`#RRGGBB\` — e.g. \`${prefix}setcolor #ff5b8e\``,
      }));
    }

    prem.embedColor = hex;
    await prem.save();

    const container = new ContainerBuilder();
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `## ✅ Embed Color Updated\n\n` +
        `> Your custom color has been set to \`${hex}\`.\n` +
        `-# This will apply to all bot embeds for your ${prem.type}.`
      )
    );
    return message.channel.send(v2({
      components: [container],
      flags: MessageFlags.IsComponentsV2,
    }));
  },
};
