/** @format */
const { EmbedBuilder, ApplicationCommandOptionType, ChannelType, PermissionFlagsBits } = require("discord.js");
const ServerStats = require("../../schema/serverstats");
const { updateGuildStats, parseTemplate } = require("../../utils/serverStatsService");
const { v2 } = require("../../utils/v2");

module.exports = {
  name: "serverstats",
  description: "Configure and manage the live server stats tracking feature.",
  userPrams: ["ManageGuild"],
  botPrams: ["ManageChannels"],
  options: [
    {
      name: "setup",
      description: "Auto-create a category and standard stats channels.",
      type: ApplicationCommandOptionType.Subcommand,
    },
    {
      name: "toggle",
      description: "Toggle the stats tracking system on/off.",
      type: ApplicationCommandOptionType.Subcommand,
    },
    {
      name: "add",
      description: "Add an existing channel to the stats tracker.",
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: "channel",
          description: "The channel to use.",
          type: ApplicationCommandOptionType.Channel,
          required: true,
        },
        {
          name: "template",
          description: "Name template (e.g., '📊 Members: {total}').",
          type: ApplicationCommandOptionType.String,
          required: true,
        },
      ],
    },
    {
      name: "remove",
      description: "Remove a channel from stats tracking.",
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: "channel",
          description: "The channel to remove.",
          type: ApplicationCommandOptionType.Channel,
          required: true,
        },
      ],
    },
    {
      name: "list",
      description: "List currently tracked stats channels.",
      type: ApplicationCommandOptionType.Subcommand,
    },
    {
      name: "update",
      description: "Force update live server stats.",
      type: ApplicationCommandOptionType.Subcommand,
    },
    {
      name: "include-bots",
      description: "Configure whether to count bots in online stats.",
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: "enable",
          description: "True to count bots, false to count only humans.",
          type: ApplicationCommandOptionType.Boolean,
          required: true,
        }
      ]
    },
  ],

  run: async (client, interaction) => {
    await interaction.deferReply({ ephemeral: true });

    let settings = await ServerStats.findOne({ guildId: interaction.guildId });
    if (!settings) {
      settings = new ServerStats({ guildId: interaction.guildId });
      await settings.save();
    }

    const subcommand = interaction.options.getSubcommand();
    const guild = interaction.guild;

    if (subcommand === "setup") {
      try {
        // Create stats category
        const category = await guild.channels.create({
          name: "📊 Server Stats",
          type: ChannelType.GuildCategory,
          permissionOverwrites: [
            {
              id: guild.roles.everyone.id,
              deny: [PermissionFlagsBits.Connect], // Make it unconnectable/read-only for voice
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

        return interaction.editReply(v2({ embeds: [embed] }));
      } catch (err) {
        client.logger.log(`[Stats Setup] Error auto-creating channels: ${err.message}`, "error");
        return interaction.editReply(v2(`⚠️ Failed to complete stats setup: ${err.message}`));
      }
    }

    if (subcommand === "toggle") {
      settings.isEnabled = !settings.isEnabled;
      await settings.save();
      return interaction.editReply(v2(`✅ Live server stats tracking is now **${settings.isEnabled ? "Enabled" : "Disabled"}**.`));
    }

    if (subcommand === "add") {
      const channel = interaction.options.getChannel("channel");
      const template = interaction.options.getString("template");

      const existingIndex = (settings.channels || []).findIndex(c => c.channelId === channel.id);
      const newChanObj = { channelId: channel.id, template };

      let list = settings.channels || [];
      if (existingIndex > -1) {
        list[existingIndex] = newChanObj;
      } else {
        list.push(newChanObj);
      }

      settings.channels = list;
      settings.markModified("channels");
      await settings.save();

      // Immediately run update to set correct name
      await updateGuildStats(client, guild.id);

      return interaction.editReply(v2(`✅ Successfully added <#${channel.id}> to stats tracking with template \`${template}\`.`));
    }

    if (subcommand === "remove") {
      const channel = interaction.options.getChannel("channel");
      const list = settings.channels || [];
      const filtered = list.filter(c => c.channelId !== channel.id);

      if (list.length === filtered.length) {
        return interaction.editReply(v2(`⚠️ Channel <#${channel.id}> is not being tracked.`));
      }

      settings.channels = filtered;
      settings.markModified("channels");
      await settings.save();

      return interaction.editReply(v2(`✅ Successfully removed <#${channel.id}> from stats tracking.`));
    }

    if (subcommand === "list") {
      const list = settings.channels || [];
      if (!list.length) {
        return interaction.editReply(v2("📊 No channels are currently tracked. Use `/serverstats setup` or `/serverstats add` to start tracking."));
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

      return interaction.editReply(v2({ embeds: [embed] }));
    }

    if (subcommand === "update") {
      await updateGuildStats(client, guild.id);
      return interaction.editReply(v2("✅ Live stats update triggered successfully. Note: Channel renames are subject to rate limiting by Discord."));
    }

    if (subcommand === "include-bots") {
      const enable = interaction.options.getBoolean("enable");
      settings.includeBots = enable;
      await settings.save();
      await updateGuildStats(client, guild.id);
      return interaction.editReply(v2(`✅ Bots will **${enable ? "now" : "no longer"}** be counted in the online stats.`));
    }
  },
};
