/** @format */

const { v2 } = require("../../utils/v2");

const {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  MessageFlags,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require("discord.js");
const Premium = require("../../schema/premium");
const { isBotOwner } = require("../../utils/owners");
const { clearPremiumCache } = require("../../utils/premiumFeatures");
const { repairPremiumIndexes } = require("../../utils/premiumIndexes");

const TIERS = {
  basic: { label: "⭐ Basic",  color: "#f1c40f", perks: ["Custom Prefix", "No Ads", "Priority Support"] },
  pro:   { label: "💎 Pro",    color: "#9b59b6", perks: ["All Basic perks", "Unlimited Queue", "Advanced Filters", "Custom Embed Color"] },
  elite: { label: "👑 Elite",  color: "#e91e63", perks: ["All Pro perks", "Priority Play", "Custom Bot Tag", "Exclusive Badges"] },
};

TIERS.basic.label = "Basic";
TIERS.pro.label = "Pro";
TIERS.elite.label = "Elite";

module.exports = {
  name: "premium",
  category: "Owner",
  aliases: ["prem"],
  description: "Manage premium for guilds and users.",
  args: false,
  usage: "[add/remove/info/list] [user/guild] [id]",
  owner: true,
  execute: async (message, args, client, prefix) => {
    if (!isBotOwner(client, message.author.id)) {
      return message.reply(v2({
        components: [
          new ContainerBuilder().addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `${client.emoji.cross} | Only bot owners can use this command.`
            )
          ),
        ],
        flags: MessageFlags.IsComponentsV2,
      }));
    }

    const sub = args[0]?.toLowerCase();

    // ── LIST ───────────────────────────────────────────────────────────
    if (!sub || sub === "list") {
      const allPremium = await Premium.find({});
      const active = allPremium.filter(p => p.isActive());
      const expired = allPremium.filter(p => !p.isActive());

      const guilds = active.filter(p => p.type === "guild");
      const users  = active.filter(p => p.type === "user");

      const container = new ContainerBuilder();
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `## 👑 Premium Overview\n-# ${active.length} active · ${expired.length} expired`
        )
      );
      container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `**Premium Guilds (${guilds.length})**\n` +
          (guilds.length > 0
            ? guilds.map(g => `> \`${g.id}\` — ${TIERS[g.tier]?.label || g.tier} — ${g.expiresAt ? `<t:${Math.floor(g.expiresAt/1000)}:R>` : "Lifetime"}`).join("\n")
            : "> *None yet.*")
        )
      );
      container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `**Premium Users (${users.length})**\n` +
          (users.length > 0
            ? users.map(u => `> <@${u.id}> — ${TIERS[u.tier]?.label || u.tier} — ${u.expiresAt ? `<t:${Math.floor(u.expiresAt/1000)}:R>` : "Lifetime"}`).join("\n")
            : "> *None yet.*")
        )
      );

      return message.channel.send(v2({
        components: [container],
        flags: MessageFlags.IsComponentsV2,
      }));
    }

    // ── ADD ────────────────────────────────────────────────────────────
    if (sub === "add") {
      const type = args[1]?.toLowerCase(); // "guild" or "user"
      const id   = args[2];
      const tier = (args[3]?.toLowerCase()) || "basic";
      const days = parseInt(args[4]) || null; // optional: days until expiry

      if (!type || !["guild", "user"].includes(type) || !id) {
        return message.reply(v2({
          components: [
            new ContainerBuilder().addTextDisplayComponents(
              new TextDisplayBuilder().setContent(
                `**Usage:** \`${prefix}premium add <guild|user> <id> [tier] [days]\`\n` +
                `-# Tiers: \`basic\` \`pro\` \`elite\` — Leave days blank for lifetime`
              )
            ),
          ],
          flags: MessageFlags.IsComponentsV2,
        }));
      }

      if (!TIERS[tier]) {
        return message.reply(v2({ content: "Invalid tier. Choose: `basic`, `pro`, `elite`" }));
      }

      const expiresAt = days ? new Date(Date.now() + days * 864e5) : null;
      const features = {
        customPrefix:    ["pro", "elite"].includes(tier),
        unlimitedQueue:  ["pro", "elite"].includes(tier),
        priorityPlay:    tier === "elite",
        customEmbed:     ["pro", "elite"].includes(tier),
        advancedFilters: ["pro", "elite"].includes(tier),
        noAds:           true,
        leveling:        ["pro", "elite"].includes(tier),
        branding:        ["pro", "elite"].includes(tier),
        vcGuard:         tier === "elite",
        stickyMessages:  tier === "elite",
        dashboard:       true,
      };

      await repairPremiumIndexes(client.logger);
      const previous = await Premium.findOne({ id }).lean();
      const entry = await Premium.findOneAndUpdate(
        { id },
        {
          $set: {
            id,
            type,
            tier,
            expiresAt,
            addedBy: message.author.id,
            features,
            status: "manual",
          },
          $setOnInsert: { addedAt: new Date() },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );
      if (previous?.type && previous.type !== type) clearPremiumCache(id, previous.type);
      clearPremiumCache(id, type);

      const tierInfo = TIERS[tier];
      const container = new ContainerBuilder();
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `## ${tierInfo.label} Premium Granted ✅\n-# Added by <@${message.author.id}>`
        )
      );
      container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `**Target:** ${type === "user" ? `<@${id}>` : `\`${id}\``}\n` +
          `**Tier:** ${tierInfo.label}\n` +
          `**Expires:** ${expiresAt ? `<t:${Math.floor(expiresAt/1000)}:R>` : "Never (Lifetime)"}\n\n` +
          `**Perks Unlocked:**\n${tierInfo.perks.map(p => `> ✦ ${p}`).join("\n")}`
        )
      );

      return message.channel.send(v2({
        components: [container],
        flags: MessageFlags.IsComponentsV2,
      }));
    }

    // ── REMOVE ─────────────────────────────────────────────────────────
    if (sub === "remove" || sub === "rem") {
      const id = args[1];
      if (!id) return message.reply(v2({ content: `**Usage:** \`${prefix}premium remove <id>\`` }));

      const deleted = await Premium.findOneAndDelete({ id });
      if (deleted) clearPremiumCache(id, deleted.type);
      const container = new ContainerBuilder();
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          deleted
            ? `${client.emoji.tick || "✅"} | Premium removed for \`${id}\`.`
            : `${client.emoji.cross} | No premium entry found for \`${id}\`.`
        )
      );
      return message.channel.send(v2({
        components: [container],
        flags: MessageFlags.IsComponentsV2,
      }));
    }

    // ── INFO ───────────────────────────────────────────────────────────
    if (sub === "info") {
      const id = args[1] || message.guild.id;
      const entry = await Premium.findOne({ id });

      const container = new ContainerBuilder();
      if (!entry || !entry.isActive()) {
        container.addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `## Premium Info — \`${id}\`\n\n> ❌ No active premium found for this ID.`
          )
        );
      } else {
        const tierInfo = TIERS[entry.tier];
        container.addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `## ${tierInfo.label} — \`${id}\`\n-# ${entry.type.charAt(0).toUpperCase() + entry.type.slice(1)} premium`
          )
        );
        container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));
        container.addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `**Added by:** <@${entry.addedBy}>\n` +
            `**Added on:** <t:${Math.floor(entry.addedAt/1000)}:D>\n` +
            `**Expires:** ${entry.expiresAt ? `<t:${Math.floor(entry.expiresAt/1000)}:R>` : "Never (Lifetime)"}\n` +
            (entry.note ? `**Note:** ${entry.note}\n` : "") +
            `\n**Active Features:**\n` +
            Object.entries(entry.features)
              .filter(([, v]) => v)
              .map(([k]) => `> ✦ ${k.replace(/([A-Z])/g, ' $1').trim()}`)
              .join("\n")
          )
        );
      }
      return message.channel.send(v2({
        components: [container],
        flags: MessageFlags.IsComponentsV2,
      }));
    }

    // fallthrough
    return message.reply(v2({
      content: `**Usage:** \`${prefix}premium <list|add|remove|info>\``,
    }));
  },
};
