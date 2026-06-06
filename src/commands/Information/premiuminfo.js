const { v2 } = require("../../utils/v2");
/** @format
 * premiuminfo — Shows premium status for the current guild/user
 */

const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  MessageFlags,
} = require("discord.js");
const Premium = require("../../schema/premium");

const TIERS = {
  basic: { label: "⭐ Basic",  perks: ["Custom Prefix", "No Ads", "Priority Support"] },
  pro:   { label: "💎 Pro",    perks: ["All Basic perks", "Unlimited Queue", "Advanced Filters", "Custom Embed Color"] },
  elite: { label: "👑 Elite",  perks: ["All Pro perks", "Priority Play", "Custom Bot Tag", "Exclusive Badges"] },
};

module.exports = {
  name: "premiuminfo",
  category: "Information",
  aliases: ["prinfo", "mypremium", "checkpr"],
  description: "Check your or this server's premium status.",
  cooldown: 5,
  execute: async (message, args, client, prefix) => {
    const userPrem  = await Premium.findOne({ id: message.author.id, type: "user"  });
    const guildPrem = await Premium.findOne({ id: message.guild.id,  type: "guild" });

    const uActive = userPrem?.isActive();
    const gActive = guildPrem?.isActive();

    const container = new ContainerBuilder();
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `## ✨ Premium Status`
      )
    );
    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

    // ── User premium ──
    if (uActive) {
      const tier = TIERS[userPrem.tier];
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `**Your Premium — ${tier.label}**\n` +
          `> Expires: ${userPrem.expiresAt ? `<t:${Math.floor(userPrem.expiresAt/1000)}:R>` : "Lifetime"}\n` +
          `> Perks: ${tier.perks.join(", ")}`
        )
      );
    } else {
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `**Your Premium**\n> ❌ No personal premium active.`
        )
      );
    }

    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

    // ── Guild premium ──
    if (gActive) {
      const tier = TIERS[guildPrem.tier];
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `**Server Premium — ${tier.label}**\n` +
          `> Expires: ${guildPrem.expiresAt ? `<t:${Math.floor(guildPrem.expiresAt/1000)}:R>` : "Lifetime"}\n` +
          `> Perks: ${tier.perks.join(", ")}\n` +
          (guildPrem.embedColor ? `> Custom Color: \`${guildPrem.embedColor}\`` : "") +
          (guildPrem.customTag  ? `\n> Custom Tag: \`${guildPrem.customTag}\`` : "")
        )
      );
    } else {
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `**Server Premium**\n> ❌ This server has no premium.`
        )
      );
    }

    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `-# Contact a bot owner to manage premium.`
      )
    );

    return message.channel.send(v2({
      components: [container],
      flags: MessageFlags.IsComponentsV2,
    }));
  },
};
