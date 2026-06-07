const { v2 } = require("../../utils/v2");
const { EmbedBuilder, ChannelType, PermissionsBitField } = require("discord.js");
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
  aliases: ["logs", "logging"],
  category: "Config",
  description: "Configure and manage the advanced logging system.",
  args: false,
  usage: "[set <#channel> <eventKey | all> | remove <eventKey | all> | ignore <target> | view]",
  userPerms: ["ManageGuild"],
  botPerms: ["EmbedLinks"],
  cooldown: 3,

  execute: async (message, args, client, prefix) => {
    let data = await Logging.findOne({ guildId: message.guild.id });
    if (!data) {
      data = new Logging({ guildId: message.guild.id });
      await data.save();
    }

    const subcommand = args[0]?.toLowerCase();

    if (!subcommand) {
      const helpEmbed = new EmbedBuilder()
        .setTitle("📊 Logging Configuration Help")
        .setDescription(`Configure the advanced Sapphire-style logging system from chat.\n\n` +
          `**Commands:**\n` +
          `• \`${prefix}log set <#channel | channelId> <eventKey1 | all> [eventKey2]...\`\n` +
          `• \`${prefix}log remove <eventKey1 | all> [eventKey2]...\`\n` +
          `• \`${prefix}log ignore <#channel | @role | @user | ID>\`\n` +
          `• \`${prefix}log view\`\n\n` +
          `**Valid Event Keys:**\n` +
          VALID_EVENTS.map(e => `\`${e}\``).join(", ")
        )
        .setColor(client.embedColor || "#5865F2");
      return message.reply(v2({ embeds: [helpEmbed] }));
    }

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

      return message.reply(v2({ embeds: [viewEmbed] }));
    }

    if (subcommand === "set") {
      const channelArg = args[1];
      if (!channelArg) {
        return message.reply(v2("⚠️ Please provide a channel to log events to."));
      }

      const channel = message.mentions.channels.first() || message.guild.channels.cache.get(channelArg);
      if (!channel) {
        return message.reply(v2("⚠️ Please provide a valid text channel, thread, or forum channel."));
      }

      // Validate event keys
      const eventArgs = args.slice(2);
      if (!eventArgs.length) {
        return message.reply(v2("⚠️ Please specify at least one event key or `all`."));
      }

      let eventsToSet = [];
      if (eventArgs[0].toLowerCase() === "all") {
        eventsToSet = [...VALID_EVENTS];
      } else {
        const invalidEvents = [];
        eventArgs.forEach(arg => {
          if (VALID_EVENTS.includes(arg)) {
            eventsToSet.push(arg);
          } else {
            invalidEvents.push(arg);
          }
        });

        if (invalidEvents.length) {
          return message.reply(v2(`⚠️ Invalid event key(s): ${invalidEvents.map(e => `\`${e}\``).join(", ")}\n` +
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

      return message.reply(v2(`✅ Successfully set logging channel for **${eventsToSet.length}** event(s) to ${channel.toString()}.`));
    }

    if (subcommand === "remove") {
      const eventArgs = args.slice(1);
      if (!eventArgs.length) {
        return message.reply(v2("⚠️ Please specify at least one event key to remove, or `all`."));
      }

      let eventsToRemove = [];
      if (eventArgs[0].toLowerCase() === "all") {
        eventsToRemove = [...VALID_EVENTS];
      } else {
        const invalidEvents = [];
        eventArgs.forEach(arg => {
          if (VALID_EVENTS.includes(arg)) {
            eventsToRemove.push(arg);
          } else {
            invalidEvents.push(arg);
          }
        });

        if (invalidEvents.length) {
          return message.reply(v2(`⚠️ Invalid event key(s): ${invalidEvents.map(e => `\`${e}\``).join(", ")}`));
        }
      }

      const currentChannels = data.eventChannels || {};
      eventsToRemove.forEach(ev => {
        delete currentChannels[ev];
      });

      data.eventChannels = currentChannels;
      data.markModified("eventChannels");
      await data.save();

      return message.reply(v2(`✅ Successfully removed logging configuration for **${eventsToRemove.length}** event(s).`));
    }

    if (subcommand === "ignore") {
      const targetArg = args[1];
      if (!targetArg) {
        return message.reply(v2("⚠️ Please specify a target channel, role, or user (mention or ID)."));
      }

      let targetId = null;
      let targetType = null;
      let targetDisplay = "";

      if (message.mentions.channels.first()) {
        const channel = message.mentions.channels.first();
        targetId = channel.id;
        targetType = "channel";
        targetDisplay = channel.toString();
      } else if (message.mentions.roles.first()) {
        const role = message.mentions.roles.first();
        targetId = role.id;
        targetType = "role";
        targetDisplay = role.toString();
      } else if (message.mentions.users.first()) {
        const user = message.mentions.users.first();
        targetId = user.id;
        targetType = "user";
        targetDisplay = user.toString();
      } else {
        if (/^\d{16,22}$/.test(targetArg)) {
          if (message.guild.channels.cache.has(targetArg)) {
            targetId = targetArg;
            targetType = "channel";
            targetDisplay = `<#${targetArg}>`;
          } else if (message.guild.roles.cache.has(targetArg)) {
            targetId = targetArg;
            targetType = "role";
            targetDisplay = `<@&${targetArg}>`;
          } else {
            const user = await client.users.fetch(targetArg).catch(() => null);
            if (user) {
              targetId = targetArg;
              targetType = "user";
              targetDisplay = `<@${targetArg}>`;
            }
          }
        }
      }

      if (!targetId || !targetType) {
        return message.reply(v2("⚠️ Could not resolve target. Please mention a channel, role, user, or provide a valid ID."));
      }

      if (targetType === "channel") {
        const arr = data.ignoredChannels || [];
        if (arr.includes(targetId)) {
          data.ignoredChannels = arr.filter(id => id !== targetId);
          await data.save();
          return message.reply(v2(`✅ Removed channel ${targetDisplay} from the logging ignore list.`));
        } else {
          arr.push(targetId);
          data.ignoredChannels = arr;
          data.markModified("ignoredChannels");
          await data.save();
          return message.reply(v2(`✅ Added channel ${targetDisplay} to the logging ignore list.`));
        }
      } else if (targetType === "role") {
        const arr = data.ignoredRoles || [];
        if (arr.includes(targetId)) {
          data.ignoredRoles = arr.filter(id => id !== targetId);
          await data.save();
          return message.reply(v2(`✅ Removed role ${targetDisplay} from the logging ignore list.`));
        } else {
          arr.push(targetId);
          data.ignoredRoles = arr;
          data.markModified("ignoredRoles");
          await data.save();
          return message.reply(v2(`✅ Added role ${targetDisplay} to the logging ignore list.`));
        }
      } else if (targetType === "user") {
        const arr = data.ignoredUsers || [];
        if (arr.includes(targetId)) {
          data.ignoredUsers = arr.filter(id => id !== targetId);
          await data.save();
          return message.reply(v2(`✅ Removed user ${targetDisplay} from the logging ignore list.`));
        } else {
          arr.push(targetId);
          data.ignoredUsers = arr;
          data.markModified("ignoredUsers");
          await data.save();
          return message.reply(v2(`✅ Added user ${targetDisplay} to the logging ignore list.`));
        }
      }
    }

    return message.reply(v2("⚠️ Unknown subcommand."));
  }
};
