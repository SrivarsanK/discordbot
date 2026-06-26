const { EmbedBuilder, ChannelType, PermissionFlagsBits } = require("discord.js");
const ServerStats = require("../../schema/serverstats");
const { updateGuildStats, parseTemplate } = require("../../utils/serverStatsService");
const { v2 } = require("../../utils/v2");

module.exports = {
  name: "serverstats",
  category: "Config",
  description: "Configure and manage the live server stats tracking feature.",
  args: false,
  usage: "<setup/toggle/list/update/include-bots> [arguments]",
  aliases: ["statsconfig", "ss"],
  botPrams: ["EmbedLinks", "ManageChannels"],
  userPerms: ["ManageGuild"],
  owner: false,
  cooldown: 3,
  execute: async (message, args, client, prefix) => {
    let settings = await ServerStats.findOne({ guildId: message.guildId });
    if (!settings) {
      settings = new ServerStats({ guildId: message.guildId });
      await settings.save();
    }

    const subcommand = args[0]?.toLowerCase();
    const guild = message.guild;

    if (!subcommand) {
      return message.reply(v2(`⚠️ Please specify a subcommand. Usage: \`${prefix}serverstats <setup/toggle/list/update/include-bots>\``));
    }

    if (subcommand === "setup") {
      const msg = await message.reply(v2("📊 Setting up server stats channels..."));
      try {
        const category = await guild.channels.create({
          name: "📊 Server Stats",
          type: ChannelType.GuildCategory,
          permissionOverwrites: [
            {
              id: guild.roles.everyone.id,
              deny: [PermissionFlagsBits.Connect],
            },
          ],
        });

        const templates = [
          "📊 Members: {total}",
          "🟢 Online: {online}",
          "🤖 Bots: {bots}",
        ];

        const createdChannels = [];
        for (const template of templates) {
          const name = parseTemplate(template, guild);
          const vc = await guild.channels.create({
            name,
            type: ChannelType.GuildVoice,
            parent: category.id,
            permissionOverwrites: [
              {
                id: guild.roles.everyone.id,
                deny: [PermissionFlagsBits.Connect],
              },
            ],
          });
          createdChannels.push({ channelId: vc.id, template });
        }

        settings.categoryChannelId = category.id;
        settings.channels = createdChannels;
        settings.isEnabled = true;
        settings.markModified("channels");
        await settings.save();

        const embed = new EmbedBuilder()
          .setTitle("📊 Stats Auto-Setup Complete")
          .setDescription("Successfully created a stats category and 3 stats channels.\n\n" +
            `• **Category:** ${category.name}\n` +
            createdChannels.map(c => `• <#${c.channelId}> (Template: \`${c.template}\`)`).join("\n")
          )
          .setColor(client.embedColor || "#5865F2");

        return msg.edit(v2({ content: "", embeds: [embed] }));
      } catch (err) {
        client.logger?.log(`[Stats Setup] Error auto-creating channels: ${err.message}`, "error");
        return msg.edit(v2(`⚠️ Failed to complete stats setup: ${err.message}`));
      }
    }

    if (subcommand === "toggle") {
      settings.isEnabled = !settings.isEnabled;
      await settings.save();
      return message.reply(v2(`✅ Live server stats tracking is now **${settings.isEnabled ? "Enabled" : "Disabled"}**.`));
    }

    if (subcommand === "update") {
      const msg = await message.reply(v2("📊 Triggering live stats update..."));
      await updateGuildStats(client, guild.id);
      return msg.edit(v2("✅ Live stats update triggered successfully. Note: Channel renames are subject to rate limiting by Discord."));
    }

    if (subcommand === "include-bots") {
      const arg = args[1]?.toLowerCase();
      if (arg !== "true" && arg !== "false") {
        return message.reply(v2(`⚠️ Usage: \`${prefix}serverstats include-bots <true/false>\``));
      }
      const enable = arg === "true";
      settings.includeBots = enable;
      await settings.save();
      await updateGuildStats(client, guild.id);
      return message.reply(v2(`✅ Bots will **${enable ? "now" : "no longer"}** be counted in the online stats.`));
    }

    if (subcommand === "list") {
      const list = settings.channels || [];
      if (!list.length) {
        return message.reply(v2(`📊 No channels are currently tracked. Use \`${prefix}serverstats setup\` to start tracking.`));
      }

      const embed = new EmbedBuilder()
        .setTitle("📊 Tracked Server Stats Channels")
        .setDescription(
          `Status: **${settings.isEnabled ? "🟢 Enabled" : "🔴 Disabled"}**\n` +
          `Category ID: \`${settings.categoryChannelId || "None"}\`\n\n` +
          list.map(c => `• <#${c.channelId}>: \`${c.template}\``).join("\n") + "\n\n" +
          "**Variables:**\n" +
          "`{total}` / `{members}` - Total members\n" +
          "`{humans}` - Human members\n" +
          "`{bots}` - Bots\n" +
          "`{online}` - Online members\n" +
          "`{offline}` - Offline members\n" +
          "`{channels}` - Total channels\n" +
          "`{roles}` - Total roles\n" +
          "`{boosts}` - Guild server boosts\n" +
          "`{tier}` - Guild premium tier"
        )
        .setColor(client.embedColor || "#5865F2");

      return message.reply(v2({ embeds: [embed] }));
    }

    return message.reply(v2(`⚠️ Unknown subcommand. Valid subcommands: \`setup\`, \`toggle\`, \`list\`, \`update\`, \`include-bots\``));
  },
};
