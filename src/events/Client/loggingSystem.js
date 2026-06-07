/** @format */
const { Events, EmbedBuilder, AuditLogEvent, ChannelType } = require("discord.js");
const { sendEventLog } = require("../../utils/logSender");

module.exports = {
  name: Events.ClientReady,
  once: true,
  run: async (client) => {
    client.logger?.log("[LoggingSystem] Initializing logging event listeners...", "ready");

    // Helper to fetch executor from audit logs safely
    async function fetchExecutor(guild, actionType) {
      try {
        const botMember = guild.members.me;
        if (!botMember || !botMember.permissions.has("ViewAuditLog")) return null;

        const auditLogs = await guild.fetchAuditLogs({ type: actionType, limit: 1 }).catch(() => null);
        const entry = auditLogs?.entries.first();
        if (entry && Date.now() - entry.createdTimestamp < 5000) {
          return entry.executor;
        }
      } catch {}
      return null;
    }

    // ── MESSAGE EVENTS ──
    client.on("messageDelete", async (message) => {
      if (message.partial || !message.guild || message.author?.bot) return;

      const context = {
        channelId: message.channel.id,
        author: message.author,
        member: message.member,
        hasEmbeds: message.embeds?.length > 0,
        isPoll: !!message.poll,
        isSticky: message.author?.id === client.user.id && message.content?.includes("sticky"),
      };

      await sendEventLog(client, message.guild, "messageDelete", async () => {
        const executor = await fetchExecutor(message.guild, AuditLogEvent.MessageDelete);
        const embed = new EmbedBuilder()
          .setTitle("🗑️ Message Deleted")
          .setColor("#ff3333")
          .setDescription(`**Author:** ${message.author} (${message.author.tag})\n**Channel:** ${message.channel}\n` +
            (executor ? `**Deleted By:** ${executor} (${executor.tag})\n` : ""))
          .addFields(
            { name: "Content", value: message.content ? (message.content.substring(0, 1000) || "*None*") : "*Empty/Embed*" }
          )
          .setTimestamp();

        if (message.attachments.size > 0) {
          const files = message.attachments.map(a => `[${a.name}](${a.url})`).join(", ");
          embed.addFields({ name: "Attachments", value: files.substring(0, 1024) });
        }

        return { embeds: [embed] };
      }, context);
    });

    client.on("messageUpdate", async (oldMessage, newMessage) => {
      if (newMessage.partial || !newMessage.guild || newMessage.author?.bot) return;
      if (oldMessage.content === newMessage.content) return; // Ignore non-content updates (like embed loads)

      const context = {
        channelId: newMessage.channel.id,
        author: newMessage.author,
        member: newMessage.member,
      };

      await sendEventLog(client, newMessage.guild, "messageUpdate", async () => {
        const embed = new EmbedBuilder()
          .setTitle("✏️ Message Edited")
          .setColor("#3399ff")
          .setDescription(`**Author:** ${newMessage.author} (${newMessage.author.tag})\n**Channel:** ${newMessage.channel}`)
          .addFields(
            { name: "Before", value: oldMessage.content ? (oldMessage.content.substring(0, 1000) || "*None*") : "*None*" },
            { name: "After", value: newMessage.content ? (newMessage.content.substring(0, 1000) || "*None*") : "*None*" }
          )
          .setTimestamp();

        return { embeds: [embed] };
      }, context);
    });

    // ── CHANNEL EVENTS ──
    client.on("channelCreate", async (channel) => {
      if (!channel.guild) return;

      await sendEventLog(client, channel.guild, "channelCreate", async () => {
        const executor = await fetchExecutor(channel.guild, AuditLogEvent.ChannelCreate);
        const embed = new EmbedBuilder()
          .setTitle("📁 Channel Created")
          .setColor("#33ff33")
          .setDescription(`**Channel:** ${channel} (#${channel.name})\n**Type:** ${ChannelType[channel.type]}\n` +
            (executor ? `**Created By:** ${executor} (${executor.tag})` : ""))
          .setTimestamp();

        return { embeds: [embed] };
      });
    });

    client.on("channelDelete", async (channel) => {
      if (!channel.guild) return;

      await sendEventLog(client, channel.guild, "channelDelete", async () => {
        const executor = await fetchExecutor(channel.guild, AuditLogEvent.ChannelDelete);
        const embed = new EmbedBuilder()
          .setTitle("📁 Channel Deleted")
          .setColor("#ff3333")
          .setDescription(`**Name:** #${channel.name}\n**Type:** ${ChannelType[channel.type]}\n` +
            (executor ? `**Deleted By:** ${executor} (${executor.tag})` : ""))
          .setTimestamp();

        return { embeds: [embed] };
      });
    });

    client.on("channelUpdate", async (oldChannel, newChannel) => {
      if (!newChannel.guild) return;

      await sendEventLog(client, newChannel.guild, "channelUpdate", async () => {
        const executor = await fetchExecutor(newChannel.guild, AuditLogEvent.ChannelUpdate);
        const changes = [];

        if (oldChannel.name !== newChannel.name) {
          changes.push(`**Name:** \`#${oldChannel.name}\` ➔ \`#${newChannel.name}\``);
        }
        if (oldChannel.topic !== newChannel.topic) {
          changes.push(`**Topic:** \`${oldChannel.topic || "None"}\` ➔ \`${newChannel.topic || "None"}\``);
        }
        if (oldChannel.nsfw !== newChannel.nsfw) {
          changes.push(`**NSFW:** \`${oldChannel.nsfw}\` ➔ \`${newChannel.nsfw}\``);
        }

        if (changes.length === 0) return null; // Ignore permission/other backend updates for simplicity

        const embed = new EmbedBuilder()
          .setTitle("📁 Channel Updated")
          .setColor("#3399ff")
          .setDescription(`**Channel:** ${newChannel}\n` +
            (executor ? `**Updated By:** ${executor} (${executor.tag})\n\n` : "\n") +
            changes.join("\n"))
          .setTimestamp();

        return { embeds: [embed] };
      });
    });

    // ── ROLE EVENTS ──
    client.on("roleCreate", async (role) => {
      await sendEventLog(client, role.guild, "roleCreate", async () => {
        const executor = await fetchExecutor(role.guild, AuditLogEvent.RoleCreate);
        const embed = new EmbedBuilder()
          .setTitle("🛡️ Role Created")
          .setColor("#33ff33")
          .setDescription(`**Role:** ${role} (${role.name})\n` +
            (executor ? `**Created By:** ${executor} (${executor.tag})` : ""))
          .setTimestamp();

        return { embeds: [embed] };
      });
    });

    client.on("roleDelete", async (role) => {
      await sendEventLog(client, role.guild, "roleDelete", async () => {
        const executor = await fetchExecutor(role.guild, AuditLogEvent.RoleDelete);
        const embed = new EmbedBuilder()
          .setTitle("🛡️ Role Deleted")
          .setColor("#ff3333")
          .setDescription(`**Name:** ${role.name}\n` +
            (executor ? `**Deleted By:** ${executor} (${executor.tag})` : ""))
          .setTimestamp();

        return { embeds: [embed] };
      });
    });

    client.on("roleUpdate", async (oldRole, newRole) => {
      await sendEventLog(client, newRole.guild, "roleUpdate", async () => {
        const executor = await fetchExecutor(newRole.guild, AuditLogEvent.RoleUpdate);
        const changes = [];

        if (oldRole.name !== newRole.name) {
          changes.push(`**Name:** \`${oldRole.name}\` ➔ \`${newRole.name}\``);
        }
        if (oldRole.hexColor !== newRole.hexColor) {
          changes.push(`**Color:** \`${oldRole.hexColor}\` ➔ \`${newRole.hexColor}\``);
        }
        if (oldRole.permissions.bitfield !== newRole.permissions.bitfield) {
          changes.push(`**Permissions Changed**`);
        }

        if (changes.length === 0) return null;

        const embed = new EmbedBuilder()
          .setTitle("🛡️ Role Updated")
          .setColor("#3399ff")
          .setDescription(`**Role:** ${newRole}\n` +
            (executor ? `**Updated By:** ${executor} (${executor.tag})\n\n` : "\n") +
            changes.join("\n"))
          .setTimestamp();

        return { embeds: [embed] };
      });
    });

    // ── MEMBER EVENTS ──
    client.on("guildMemberAdd", async (member) => {
      await sendEventLog(client, member.guild, "guildMemberAdd", async () => {
        const embed = new EmbedBuilder()
          .setTitle("📥 Member Joined")
          .setColor("#33ff33")
          .setThumbnail(member.user.displayAvatarURL())
          .setDescription(`**User:** ${member.user} (${member.user.tag})\n**ID:** ${member.id}\n**Account Created:** <t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`)
          .setTimestamp();

        return { embeds: [embed] };
      });
    });

    client.on("guildMemberRemove", async (member) => {
      const banLog = await fetchExecutor(member.guild, AuditLogEvent.MemberBanAdd);
      if (banLog) {
        // Skip guildMemberRemove since guildBanAdd will handle it
        return;
      }

      const kickLog = await fetchExecutor(member.guild, AuditLogEvent.MemberKick);
      if (kickLog) {
        await sendEventLog(client, member.guild, "guildMemberKick", async () => {
          const embed = new EmbedBuilder()
            .setTitle("👢 Member Kicked")
            .setColor("#ffaa00")
            .setThumbnail(member.user.displayAvatarURL())
            .setDescription(`**User:** ${member.user} (${member.user.tag})\n**ID:** ${member.id}\n` +
              `**Kicked By:** ${kickLog} (${kickLog.tag})`)
            .setTimestamp();
          return { embeds: [embed] };
        });
        return;
      }

      await sendEventLog(client, member.guild, "guildMemberRemove", async () => {
        const embed = new EmbedBuilder()
          .setTitle("📤 Member Left")
          .setColor("#aaaaaa")
          .setThumbnail(member.user.displayAvatarURL())
          .setDescription(`**User:** ${member.user} (${member.user.tag})\n**ID:** ${member.id}\n**Action:** Left the server`)
          .setTimestamp();

        return { embeds: [embed] };
      });
    });

    client.on("guildMemberUpdate", async (oldMember, newMember) => {
      // Timeout check first
      if (oldMember.communicationDisabledUntilTimestamp !== newMember.communicationDisabledUntilTimestamp) {
        const isTimeout = !!newMember.communicationDisabledUntilTimestamp;
        const executor = await fetchExecutor(newMember.guild, AuditLogEvent.MemberUpdate);
        
        await sendEventLog(client, newMember.guild, "guildMemberTimeout", async () => {
          const embed = new EmbedBuilder()
            .setTitle(isTimeout ? "⏳ Member Timed Out" : "⏳ Member Timeout Removed")
            .setColor(isTimeout ? "#ffaa00" : "#33ff33")
            .setThumbnail(newMember.user.displayAvatarURL())
            .setDescription(`**Member:** ${newMember} (${newMember.user.tag})\n**ID:** ${newMember.id}\n` +
              (isTimeout ? `**Duration:** Timed out until <t:${Math.floor(newMember.communicationDisabledUntilTimestamp / 1000)}:f>\n` : "") +
              (executor ? `**Responsible Mod:** ${executor} (${executor.tag})` : ""))
            .setTimestamp();
          return { embeds: [embed] };
        });
        return;
      }

      await sendEventLog(client, newMember.guild, "guildMemberUpdate", async () => {
        const executor = await fetchExecutor(newMember.guild, AuditLogEvent.MemberUpdate);
        const changes = [];

        if (oldMember.nickname !== newMember.nickname) {
          changes.push(`**Nickname:** \`${oldMember.nickname || "None"}\` ➔ \`${newMember.nickname || "None"}\``);
        }

        // Role changes
        const oldRoles = oldMember.roles.cache.map(r => r.id);
        const newRoles = newMember.roles.cache.map(r => r.id);
        const addedRoles = newRoles.filter(r => !oldRoles.includes(r));
        const removedRoles = oldRoles.filter(r => !newRoles.includes(r));

        if (addedRoles.length > 0) {
          changes.push(`**Added Roles:** ${addedRoles.map(rid => `<@&${rid}>`).join(", ")}`);
        }
        if (removedRoles.length > 0) {
          changes.push(`**Removed Roles:** ${removedRoles.map(rid => `<@&${rid}>`).join(", ")}`);
        }

        if (changes.length === 0) return null;

        const embed = new EmbedBuilder()
          .setTitle("👤 Member Updated")
          .setColor("#3399ff")
          .setDescription(`**Member:** ${newMember}\n` +
            (executor ? `**Updated By:** ${executor} (${executor.tag})\n\n` : "\n") +
            changes.join("\n"))
          .setTimestamp();

        return { embeds: [embed] };
      });
    });

    // ── VOICE EVENTS ──
    client.on("voiceStateUpdate", async (oldState, newState) => {
      const guild = newState.guild || oldState.guild;
      if (!guild) return;

      const context = {
        voiceMember: newState.member || oldState.member,
      };

      await sendEventLog(client, guild, "voiceStateUpdate", async () => {
        const member = newState.member || oldState.member;
        const embed = new EmbedBuilder()
          .setColor("#9933ff")
          .setTimestamp();

        if (!oldState.channelId && newState.channelId) {
          embed.setTitle("🔊 Voice Channel Joined")
            .setDescription(`**User:** ${member} (${member.user.tag})\n**Channel:** ${newState.channel}`);
        } else if (oldState.channelId && !newState.channelId) {
          embed.setTitle("🔊 Voice Channel Left")
            .setDescription(`**User:** ${member} (${member.user.tag})\n**Channel:** ${oldState.channel}`);
        } else if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
          embed.setTitle("🔊 Voice Channel Moved")
            .setDescription(`**User:** ${member} (${member.user.tag})\n**Moved:** ${oldState.channel} ➔ ${newState.channel}`);
        } else {
          return null; // Ignore mute/deafen updates
        }

        return { embeds: [embed] };
      }, context);
    });

    // ── THREAD EVENTS ──
    client.on("threadCreate", async (thread) => {
      await sendEventLog(client, thread.guild, "threadCreate", async () => {
        const embed = new EmbedBuilder()
          .setTitle("🧵 Thread Created")
          .setColor("#33ff33")
          .setDescription(`**Thread:** ${thread} (#${thread.name})\n**Parent Channel:** ${thread.parent}`)
          .setTimestamp();

        return { embeds: [embed] };
      });
    });

    client.on("threadDelete", async (thread) => {
      await sendEventLog(client, thread.guild, "threadDelete", async () => {
        const embed = new EmbedBuilder()
          .setTitle("🧵 Thread Deleted")
          .setColor("#ff3333")
          .setDescription(`**Name:** #${thread.name}\n**Parent Channel:** ${thread.parent}`)
          .setTimestamp();

        return { embeds: [embed] };
      });
    });

    client.on("threadUpdate", async (oldThread, newThread) => {
      await sendEventLog(client, newThread.guild, "threadUpdate", async () => {
        const changes = [];

        if (oldThread.name !== newThread.name) {
          changes.push(`**Name:** \`#${oldThread.name}\` ➔ \`#${newThread.name}\``);
        }
        if (oldThread.archived !== newThread.archived) {
          changes.push(`**Archived:** \`${oldThread.archived}\` ➔ \`${newThread.archived}\``);
        }

        if (changes.length === 0) return null;

        const embed = new EmbedBuilder()
          .setTitle("🧵 Thread Updated")
          .setColor("#3399ff")
          .setDescription(`**Thread:** ${newThread}\n\n` + changes.join("\n"))
          .setTimestamp();

        return { embeds: [embed] };
      });
    });

    // ── INVITE EVENTS ──
    client.on("inviteCreate", async (invite) => {
      await sendEventLog(client, invite.guild, "inviteCreate", async () => {
        const embed = new EmbedBuilder()
          .setTitle("✉️ Invite Created")
          .setColor("#33ff33")
          .setDescription(`**Code:** \`${invite.code}\`\n**Channel:** ${invite.channel}\n**Created By:** ${invite.inviter || "Unknown"}\n` +
            `**Max Uses:** ${invite.maxUses || "Unlimited"}\n**Expires:** ${invite.expiresAt ? `<t:${Math.floor(invite.expiresAt.getTime() / 1000)}:f>` : "Never"}`)
          .setTimestamp();

        return { embeds: [embed] };
      });
    });

    client.on("inviteDelete", async (invite) => {
      await sendEventLog(client, invite.guild, "inviteDelete", async () => {
        const embed = new EmbedBuilder()
          .setTitle("✉️ Invite Deleted")
          .setColor("#ff3333")
          .setDescription(`**Code:** \`${invite.code}\`\n**Channel:** ${invite.channel}`)
          .setTimestamp();

        return { embeds: [embed] };
      });
    });

    // ── WEBHOOK EVENTS ──
    client.on("webhookUpdate", async (channel) => {
      if (!channel.guild) return;

      await sendEventLog(client, channel.guild, "webhookUpdate", async () => {
        const executor = await fetchExecutor(channel.guild, AuditLogEvent.WebhookUpdate);
        const embed = new EmbedBuilder()
          .setTitle("🔗 Webhooks Updated")
          .setColor("#3399ff")
          .setDescription(`**Channel:** ${channel}\n` +
            (executor ? `**Modified By:** ${executor} (${executor.tag})` : ""))
          .setTimestamp();

        return { embeds: [embed] };
      });
    });

    // ── SERVER/GUILD UPDATE ──
    client.on("guildUpdate", async (oldGuild, newGuild) => {
      await sendEventLog(client, newGuild, "guildUpdate", async () => {
        const executor = await fetchExecutor(newGuild, AuditLogEvent.GuildUpdate);
        const changes = [];

        if (oldGuild.name !== newGuild.name) {
          changes.push(`**Name:** \`${oldGuild.name}\` ➔ \`${newGuild.name}\``);
        }
        if (oldGuild.verificationLevel !== newGuild.verificationLevel) {
          changes.push(`**Verification Level:** \`${oldGuild.verificationLevel}\` ➔ \`${newGuild.verificationLevel}\``);
        }
        if (oldGuild.ownerId !== newGuild.ownerId) {
          changes.push(`**Owner:** <@${oldGuild.ownerId}> ➔ <@${newGuild.ownerId}>`);
        }

        if (changes.length === 0) return null;

        const embed = new EmbedBuilder()
          .setTitle("🏢 Server Updated")
          .setColor("#3399ff")
          .setDescription((executor ? `**Updated By:** ${executor} (${executor.tag})\n\n` : "\n") +
            changes.join("\n"))
          .setTimestamp();

        return { embeds: [embed] };
      });
    });

    // ── MODERATION EVENTS ──
    client.on("guildBanAdd", async (ban) => {
      await sendEventLog(client, ban.guild, "guildBanAdd", async () => {
        const executor = await fetchExecutor(ban.guild, AuditLogEvent.MemberBanAdd);
        const embed = new EmbedBuilder()
          .setTitle("🔨 Member Banned")
          .setColor("#ff3333")
          .setThumbnail(ban.user.displayAvatarURL())
          .setDescription(`**User:** ${ban.user} (${ban.user.tag})\n**ID:** ${ban.user.id}\n` +
            (executor ? `**Banned By:** ${executor} (${executor.tag})\n` : "") +
            `**Reason:** ${ban.reason || "No reason provided"}`)
          .setTimestamp();
        return { embeds: [embed] };
      });
    });

    client.on("guildBanRemove", async (ban) => {
      await sendEventLog(client, ban.guild, "guildBanRemove", async () => {
        const executor = await fetchExecutor(ban.guild, AuditLogEvent.MemberBanRemove);
        const embed = new EmbedBuilder()
          .setTitle("🔓 Member Unbanned")
          .setColor("#33ff33")
          .setThumbnail(ban.user.displayAvatarURL())
          .setDescription(`**User:** ${ban.user} (${ban.user.tag})\n**ID:** ${ban.user.id}\n` +
            (executor ? `**Unbanned By:** ${executor} (${executor.tag})` : ""))
          .setTimestamp();
        return { embeds: [embed] };
      });
    });

    client.on("messageDeleteBulk", async (messages) => {
      const firstMsg = messages.first();
      if (!firstMsg || !firstMsg.guild) return;

      const context = {
        channelId: firstMsg.channel.id,
      };

      await sendEventLog(client, firstMsg.guild, "messageDeleteBulk", async () => {
        const executor = await fetchExecutor(firstMsg.guild, AuditLogEvent.MessageBulkDelete);
        const embed = new EmbedBuilder()
          .setTitle("🧹 Messages Purged")
          .setColor("#ff5500")
          .setDescription(`**Channel:** ${firstMsg.channel}\n` +
            `**Amount:** \`${messages.size}\` messages\n` +
            (executor ? `**Purged By:** ${executor} (${executor.tag})` : ""))
          .setTimestamp();
        return { embeds: [embed] };
      }, context);
    });
  },
};
