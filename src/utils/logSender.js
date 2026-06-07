/** @format */
const Logging = require("../schema/logging");
const { EmbedBuilder, ChannelType } = require("discord.js");

/**
 * Checks ignores and sends an event log to the configured channel.
 * @param {import("discord.js").Client} client
 * @param {import("discord.js").Guild|null} guild
 * @param {string} eventKey - e.g. "messageDelete", "channelCreate", etc.
 * @param {function} buildEmbedFn - Async function returning { embeds: [EmbedBuilder], content: string }
 * @param {object} contextData - Context info like channelId, executor, author, etc.
 */
async function sendEventLog(client, guild, eventKey, buildEmbedFn, contextData = {}) {
  if (!guild) return;

  try {
    const data = await Logging.findOne({ guildId: guild.id });
    if (!data || !data.isEnabled) return;

    // Resolve channel mapping
    const channelId = data.eventChannels?.[eventKey];
    if (!channelId) return;

    // Ignored channels check
    if (contextData.channelId && data.ignoredChannels?.includes(contextData.channelId)) {
      return;
    }

    // Ignores based on user (author / executor)
    const actorId = contextData.executor?.id || contextData.author?.id;
    if (actorId && data.ignoredUsers?.includes(actorId)) {
      return;
    }

    // Ignores based on roles
    if (contextData.member) {
      const hasIgnoredRole = contextData.member.roles?.cache?.some(role =>
        data.ignoredRoles?.includes(role.id)
      );
      if (hasIgnoredRole) return;
    }

    // Ignored embeds check
    if (contextData.hasEmbeds && data.ignoreEmbeds) {
      return;
    }

    // Ignored polls check
    if (contextData.isPoll && data.ignorePolls) {
      return;
    }

    // Ignored sticky messages check
    if (contextData.isSticky && data.ignoreSticky) {
      return;
    }

    // Voice states ignore check
    if (eventKey === "voiceStateUpdate" && data.applyIgnoreToVoice) {
      if (contextData.voiceMember) {
        const isUserIgnored = data.ignoredUsers?.includes(contextData.voiceMember.id);
        const hasIgnoredRole = contextData.voiceMember.roles?.cache?.some(role =>
          data.ignoredRoles?.includes(role.id)
        );
        if (isUserIgnored || hasIgnoredRole) return;
      }
    }

    // Get the log channel
    let channel = guild.channels.cache.get(channelId) || await guild.channels.fetch(channelId).catch(() => null);
    if (!channel) return;

    // If it's a forum channel, find or create the category thread
    if (channel.type === ChannelType.GuildForum) {
      const botPerms = channel.permissionsFor(guild.members.me);
      if (!botPerms || !botPerms.has(["SendMessagesInThreads", "CreatePublicThreads", "EmbedLinks"])) return;

      const FORUM_THREAD_NAMES = {
        messageDelete: "Message logs",
        messageUpdate: "Message logs",
        channelCreate: "Channel logs",
        channelDelete: "Channel logs",
        channelUpdate: "Channel logs",
        roleCreate: "Role logs",
        roleDelete: "Role logs",
        roleUpdate: "Role logs",
        guildMemberAdd: "User logs",
        guildMemberRemove: "User logs",
        guildMemberUpdate: "User logs",
        voiceStateUpdate: "Voice logs",
        threadCreate: "Thread logs",
        threadDelete: "Thread logs",
        threadUpdate: "Thread logs",
        threadMemberUpdate: "Thread logs",
        inviteCreate: "Invite logs",
        inviteDelete: "Invite logs",
        webhookUpdate: "Webhook logs",
        guildUpdate: "Server logs",
        guildBanAdd: "Moderation logs",
        guildBanRemove: "Moderation logs",
        guildMemberKick: "Moderation logs",
        guildMemberTimeout: "Moderation logs",
        messageDeleteBulk: "Moderation logs"
      };

      const threadName = FORUM_THREAD_NAMES[eventKey] || `${eventKey} logs`;
      let thread = channel.threads.cache.find(t => t.name === threadName && !t.archived);
      
      if (!thread) {
        const activeThreads = await channel.threads.fetchActive().catch(() => null);
        thread = activeThreads?.threads?.find(t => t.name === threadName);
      }

      if (!thread) {
        thread = await channel.threads.create({
          name: threadName,
          autoArchiveDuration: 60,
          reason: `Auto-created thread for logging event: ${eventKey}`,
          message: { content: `📍 Dedicated thread for **${threadName}**.` }
        }).catch(() => null);
      }

      if (!thread) return;
      channel = thread;
    }

    // Check permissions
    if (channel.type === ChannelType.GuildText || channel.type === ChannelType.GuildAnnouncement) {
      const botPerms = channel.permissionsFor(guild.members.me);
      if (!botPerms || !botPerms.has(["SendMessages", "EmbedLinks"])) return;
    } else if (channel.isThread()) {
      const botPerms = channel.parent?.permissionsFor(guild.members.me);
      if (!botPerms || !botPerms.has(["SendMessagesInThreads", "EmbedLinks"])) return;
    }

    // Build the log message payload
    const payload = await buildEmbedFn();
    if (!payload) return;

    await channel.send(payload).catch(() => null);
  } catch (err) {
    client.logger?.log(`[LogSender] Failed to log ${eventKey}: ${err.message}`, "warn");
  }
}

/**
 * Generates a verification token for thread/forum channel verification
 */
async function generateVerificationToken(guildId, eventKey) {
  try {
    const data = await Logging.findOne({ guildId });
    if (!data) return null;

    const token = `dsc:verify:${guildId}:${Math.random().toString(36).substring(2, 10)}`;
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    const tokens = (data.verificationTokens || []).filter(t => t.expiresAt > Date.now());
    tokens.push({ token, eventKey, expiresAt });

    data.verificationTokens = tokens;
    data.markModified("verificationTokens");
    await data.save();

    return token;
  } catch (err) {
    console.error("[LogSender] Failed to generate token:", err);
    return null;
  }
}

module.exports = { sendEventLog, generateVerificationToken };
