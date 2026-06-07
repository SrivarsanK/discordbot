const { v2 } = require("../../utils/v2");
const { EmbedBuilder, ApplicationCommandOptionType, ChannelType } = require("discord.js");
const Logging = require("../../schema/logging");

const VALID_EVENTS = [
  "messageDelete", "messageUpdate",
  "channelCreate", "channelDelete", "channelUpdate",
  "roleCreate", "roleDelete", "roleUpdate",
  "guildMemberAdd", "guildMemberRemove", "guildMemberUpdate",
  "voiceStateUpdate",
  "threadCreate", "threadDelete", "threadUpdate",
  "inviteCreate", "inviteDelete",
  "webhookUpdate",
  "guildUpdate",
  "guildBanAdd", "guildBanRemove",
  "guildMemberKick", "guildMemberTimeout",
  "messageDeleteBulk"
];

const EVENT_LABELS = {
  messageDelete: "🗑️ Message Delete",
  messageUpdate: "✏️ Message Update",
  channelCreate: "📁 Channel Create",
  channelDelete: "📁 Channel Delete",
  channelUpdate: "📁 Channel Update",
  roleCreate: "🛡️ Role Create",
  roleDelete: "🛡️ Role Delete",
  roleUpdate: "🛡️ Role Update",
  guildMemberAdd: "📥 Member Join",
  guildMemberRemove: "📤 Member Leave",
  guildMemberUpdate: "👤 Member Update",
  voiceStateUpdate: "🔊 Voice State Update",
  threadCreate: "🧵 Thread Create",
  threadDelete: "🧵 Thread Delete",
  threadUpdate: "🧵 Thread Update",
  inviteCreate: "✉️ Invite Create",
  inviteDelete: "✉️ Invite Delete",
  webhookUpdate: "🔗 Webhook Update",
  guildUpdate: "🏢 Server Update",
  guildBanAdd: "🔨 Member Ban",
  guildBanRemove: "🔓 Member Unban",
  guildMemberKick: "👢 Member Kick",
  guildMemberTimeout: "⏳ Member Timeout",
  messageDeleteBulk: "🧹 Message Purge (Bulk Delete)"
};

module.exports = {
  name: "log",
  description: "Configure and manage the advanced logging system.",
  userPrams: ["ManageGuild"],
  botPrams: ["EmbedLinks"],
  options: [
    {
      name: "view",
      description: "View the current logging configuration.",
      type: 1, // Subcommand
    },
    {
      name: "set",
      description: "Set the logging channel for one or more event types.",
      type: 1, // Subcommand
      options: [
        {
          name: "channel",
          description: "The channel to send the log embeds to.",
          type: 7, // Channel
          required: true,
        },
        {
          name: "events",
          description: "The event type(s) to log (comma/space-separated or 'all').",
          type: 3, // String
          required: true,
        }
      ]
    },
    {
      name: "remove",
      description: "Remove logging for one or more event types.",
      type: 1, // Subcommand
      options: [
        {
          name: "events",
          description: "The event type(s) to remove (comma/space-separated or 'all').",
          type: 3, // String
          required: true,
        }
      ]
    },
    {
      name: "ignore",
      description: "Toggle ignore list for a channel, role, or user.",
      type: 1, // Subcommand
      options: [
        {
          name: "target",
          description: "The channel, role, or user to ignore/unignore.",
          type: 9, // Mentionable
          required: true,
        }
      ]
    }
  ],

  run: async (client, interaction) => {
    await interaction.deferReply({ ephemeral: true });

    let data = await Logging.findOne({ guildId: interaction.guildId });
    if (!data) {
      data = new Logging({ guildId: interaction.guildId });
      await data.save();
    }

    const subcommand = interaction.options.getSubcommand();

    if (subcommand === "view") {
      const eventMappings = [];
      const channelsMap = data.eventChannels || {};
      
      VALID_EVENTS.forEach(eventKey => {
        const chId = channelsMap[eventKey];
        if (chId) {
          eventMappings.push(`• **${EVENT_LABELS[eventKey]}**: <#${chId}>`);
        }
      });

      const ignoredCh = (data.ignoredChannels || []).map(id => `<#${id}>`).join(", ") || "*None*";
      const ignoredRl = (data.ignoredRoles || []).map(id => `<@&${id}>`).join(", ") || "*None*";
      const ignoredUs = (data.ignoredUsers || []).map(id => `<@${id}>`).join(", ") || "*None*";

      const flags = [
        `Embeds: **${data.ignoreEmbeds ? "Ignored" : "Logged"}**`,
        `Polls: **${data.ignorePolls ? "Ignored" : "Logged"}**`,
        `Sticky Messages: **${data.ignoreSticky ? "Ignored" : "Logged"}**`,
        `Apply Ignore To Voice: **${data.applyIgnoreToVoice ? "Yes" : "No"}**`
      ].join("\n");

      const viewEmbed = new EmbedBuilder()
        .setTitle("📊 Logging Settings View")
        .setDescription(`Status: **${data.isEnabled ? "🟢 Enabled" : "🔴 Disabled"}**\n\n` +
          `__**Event Channel Mapping**__\n` +
          (eventMappings.length ? eventMappings.join("\n") : "*No events configured to log.*") + `\n\n` +
          `__**Ignore Configs**__\n` +
          `• **Ignored Channels:** ${ignoredCh}\n` +
          `• **Ignored Roles:** ${ignoredRl}\n` +
          `• **Ignored Users:** ${ignoredUs}\n\n` +
          `__**Bypass Settings**__\n` + flags
        )
        .setColor(client.embedColor || "#5865F2");

      return interaction.editReply(v2({ embeds: [viewEmbed] }));
    }

    if (subcommand === "set") {
      const channel = interaction.options.getChannel("channel");
      const eventsStr = interaction.options.getString("events");

      // Validate event keys
      const rawEvents = eventsStr.split(/[\s,]+/).filter(Boolean);
      let eventsToSet = [];

      if (rawEvents[0]?.toLowerCase() === "all") {
        eventsToSet = [...VALID_EVENTS];
      } else {
        const invalidEvents = [];
        rawEvents.forEach(arg => {
          if (VALID_EVENTS.includes(arg)) {
            eventsToSet.push(arg);
          } else {
            invalidEvents.push(arg);
          }
        });

        if (invalidEvents.length) {
          return interaction.editReply(v2(`⚠️ Invalid event key(s): ${invalidEvents.map(e => `\`${e}\``).join(", ")}\n` +
            `Valid event keys are: ${VALID_EVENTS.map(e => `\`${e}\``).join(", ")}`
          ));
        }
      }

      let channelId = channel.id;
      if (channel.isThread()) {
        const parent = channel.parent || await channel.guild.channels.fetch(channel.parentId).catch(() => null);
        if (parent && parent.type === ChannelType.GuildForum) {
          channelId = parent.id;
        }
      }

      const currentChannels = data.eventChannels || {};
      eventsToSet.forEach(ev => {
        currentChannels[ev] = channelId;
      });

      data.eventChannels = currentChannels;
      data.isEnabled = true;
      data.markModified("eventChannels");
      await data.save();

      return interaction.editReply(v2(`✅ Successfully set logging channel for **${eventsToSet.length}** event(s) to ${channel.toString()}.`));
    }

    if (subcommand === "remove") {
      const eventsStr = interaction.options.getString("events");
      const rawEvents = eventsStr.split(/[\s,]+/).filter(Boolean);
      let eventsToRemove = [];

      if (rawEvents[0]?.toLowerCase() === "all") {
        eventsToRemove = [...VALID_EVENTS];
      } else {
        const invalidEvents = [];
        rawEvents.forEach(arg => {
          if (VALID_EVENTS.includes(arg)) {
            eventsToRemove.push(arg);
          } else {
            invalidEvents.push(arg);
          }
        });

        if (invalidEvents.length) {
          return interaction.editReply(v2(`⚠️ Invalid event key(s): ${invalidEvents.map(e => `\`${e}\``).join(", ")}`));
        }
      }

      const currentChannels = data.eventChannels || {};
      eventsToRemove.forEach(ev => {
        delete currentChannels[ev];
      });

      data.eventChannels = currentChannels;
      data.markModified("eventChannels");
      await data.save();

      return interaction.editReply(v2(`✅ Successfully removed logging configuration for **${eventsToRemove.length}** event(s).`));
    }

    if (subcommand === "ignore") {
      const target = interaction.options.getMentionable("target");
      if (!target) {
        return interaction.editReply(v2("⚠️ Could not resolve target."));
      }

      // Check if target is a channel, role, or user/member
      let targetId = target.id;
      let targetType = null;
      let targetDisplay = target.toString();

      // target can be GuildChannel, ThreadChannel, Role, User, GuildMember
      if (target.type === undefined && typeof target.setColor === "function") {
        // Role
        targetType = "role";
      } else if (target.user || target.username) {
        // User/Member
        targetType = "user";
      } else {
        // Channel
        targetType = "channel";
      }

      if (targetType === "channel") {
        const arr = data.ignoredChannels || [];
        if (arr.includes(targetId)) {
          data.ignoredChannels = arr.filter(id => id !== targetId);
          await data.save();
          return interaction.editReply(v2(`✅ Removed channel ${targetDisplay} from the logging ignore list.`));
        } else {
          arr.push(targetId);
          data.ignoredChannels = arr;
          data.markModified("ignoredChannels");
          await data.save();
          return interaction.editReply(v2(`✅ Added channel ${targetDisplay} to the logging ignore list.`));
        }
      } else if (targetType === "role") {
        const arr = data.ignoredRoles || [];
        if (arr.includes(targetId)) {
          data.ignoredRoles = arr.filter(id => id !== targetId);
          await data.save();
          return interaction.editReply(v2(`✅ Removed role ${targetDisplay} from the logging ignore list.`));
        } else {
          arr.push(targetId);
          data.ignoredRoles = arr;
          data.markModified("ignoredRoles");
          await data.save();
          return interaction.editReply(v2(`✅ Added role ${targetDisplay} to the logging ignore list.`));
        }
      } else if (targetType === "user") {
        const arr = data.ignoredUsers || [];
        if (arr.includes(targetId)) {
          data.ignoredUsers = arr.filter(id => id !== targetId);
          await data.save();
          return interaction.editReply(v2(`✅ Removed user ${targetDisplay} from the logging ignore list.`));
        } else {
          arr.push(targetId);
          data.ignoredUsers = arr;
          data.markModified("ignoredUsers");
          await data.save();
          return interaction.editReply(v2(`✅ Added user ${targetDisplay} to the logging ignore list.`));
        }
      }
    }

    return interaction.editReply(v2("⚠️ Unknown subcommand."));
  }
};
