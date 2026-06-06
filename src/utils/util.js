/** @format */

const { EmbedBuilder, Collection } = require("discord.js");
const { getSettings } = require("../schema/welcomesystem");
const { buildWelcomeImageAttachment } = require("./welcomeImage");

module.exports = class Util {
  constructor(client) {
    this.client = client;
  }

  emojify(content) {
    return content
      .toLowerCase()
      .split("")
      .map((letter) => this.client.emoji[letter] || letter)
      .join("");
  }

  async sendPreview(settings, member) {
    if (!settings.welcome?.enabled)
      return "Welcome message not enabled in this server";

    const targetChannel = member.guild.channels.cache.get(
      settings.welcome.channel,
    );
    if (!targetChannel)
      return "No channel is configured to send welcome messages";

    const response = await this.buildGreeting(
      member,
      "WELCOME",
      settings.welcome,
    );
    const time = settings.welcome.autodel;

    await this.sendMessage(targetChannel, response, time);
    return `Sent welcome preview to ${targetChannel.toString()}`;
  }

  async setStatus(settings, status) {
    const enabled = status.toUpperCase() === "ON";
    settings.welcome.enabled = enabled;
    await settings.save();
    return `Configuration saved! Welcome message ${enabled ? "**enabled**" : "**disabled**"}`;
  }

  async setChannel(settings, channel) {
    if (!this.canSendEmbeds(channel)) {
      return (
        "I cannot send messages to that channel. I need the `View Channel` and `Send Messages` permissions in " +
        channel.toString()
      );
    }
    settings.welcome.channel = channel.id;
    await settings.save();
    return `Configuration saved! Welcome message will be sent to ${channel.toString()}`;
  }

  async setDescription(settings, desc) {
    settings.welcome.embed.enabled = true;
    settings.welcome.embed.description = desc;
    await settings.save();
    return "Configuration saved! Welcome message updated.";
  }

  async setFooter(settings, footer) {
    settings.welcome.embed.enabled = true;
    settings.welcome.embed.footer = footer;
    await settings.save();
    return "Configuration saved! Welcome message updated.";
  }

  async setTitle(settings, title) {
    settings.welcome.embed.enabled = true;
    settings.welcome.embed.title = title;
    await settings.save();
    return "Configuration saved! Welcome message updated.";
  }

  async setImage(settings, image) {
    settings.welcome.embed.enabled = true;
    settings.welcome.embed.image = image;
    await settings.save();
    return "Configuration saved! Welcome message updated.";
  }

  async setThumbnail(settings, thumbnail) {
    settings.welcome.embed.enabled = true;
    settings.welcome.embed.thumbnail = thumbnail;
    await settings.save();
    return "Configuration saved! Welcome message updated.";
  }

  canSendEmbeds(channel) {
    return channel
      .permissionsFor(channel.guild.members.me)
      .has(["ViewChannel", "SendMessages"]);
  }

  async buildGreeting(member, type, config) {
    if (!config) return;

    const content = config.content
      ? await this.parse(config.content, member)
      : `<@${member.user.id}>`;
    const imageAttachment = await buildWelcomeImageAttachment(
      member,
      config.dynamicImages,
      this.client.logger,
    );
    const files = imageAttachment ? [imageAttachment] : undefined;

    if (!config.embed?.enabled) {
      return { content, files };
    }

    const hasEmbedFields = Boolean(
      config.embed.description ||
        config.embed.title ||
        config.embed.footer ||
        (config.embed.image && config.embed.image !== "false") ||
        (config.embed.thumbnail && config.embed.thumbnail !== "false"),
    );
    if (!hasEmbedFields) {
      return { content, files };
    }

    const embed = new EmbedBuilder()
      .setAuthor({ name: member.user.tag, iconURL: member.displayAvatarURL() })
      .setTimestamp()
      ;

    if (this.isHex(config.embed.color)) {
      embed.setColor(config.embed.color);
    }

    if (config.embed.description) {
      embed.setDescription(await this.parse(config.embed.description, member));
    }

    // Handle thumbnail
    if (config.embed.thumbnail && config.embed.thumbnail !== "false") {
      const thumbnailURL = await this.parseDynamicURL(
        config.embed.thumbnail,
        member,
      );
      if (this.isValidURL(thumbnailURL)) {
        embed.setThumbnail(thumbnailURL);
      }
    }

    // Handle title
    if (config.embed.title) {
      embed.setTitle(await this.parse(config.embed.title, member));
    }

    // Handle image
    if (config.embed.image && config.embed.image !== "false") {
      const imageURL = await this.parseDynamicURL(config.embed.image, member);
      if (this.isValidURL(imageURL)) {
        embed.setImage(imageURL);
      }
    }

    // Handle footer
    if (config.embed.footer) {
      embed.setFooter({ text: await this.parse(config.embed.footer, member) });
    }

    if (false && !config.content && !config.embed.description && !config.embed.footer) {
      return {
        content: `<@${member.user.id}>`,
        embeds: [
          new EmbedBuilder()
            
            .setTitle(`゛𓂃﹒welcome !! `)
            .setDescription(
              `- Kindly Check RuleZ\n` +
                `- Boost if you love the guild\n` +
                `__Thanks For Joining__`,
            )
            .setFooter({
              text: `Fam: ` + member.guild.memberCount,
              iconURL: member.guild.iconURL(),
            }),
        ],
      };
    }

    return { content, embeds: [embed], files };
  }

  async sendMessage(channel, content, seconds) {
    if (!channel || !content) return;

    const permissions = channel.permissionsFor(channel.guild.members.me);
    if (!permissions.has(["ViewChannel", "SendMessages"])) return;
    if (content.embeds?.length > 0 && !permissions.has("EmbedLinks")) return;

    const payload = { ...content };
    if (payload.files?.length > 0 && !permissions.has("AttachFiles")) {
      delete payload.files;
    }
    if (!payload.content && !payload.embeds?.length && !payload.files?.length) return;

    try {
      const message = await channel.send(payload);
      if (seconds && seconds > 0) {
        setTimeout(() => {
          if (message.deletable) message.delete().catch(() => {});
        }, seconds * 1000);
      }
    } catch (error) {
      console.error("Error sending message:", error);
    }
  }

  async sendWelcome(member, settings) {
    const config = (await getSettings(member.guild))?.welcome;
    if (!config || !config.enabled) return;

    const channel = member.guild.channels.cache.get(config.channel);
    if (!channel) return;

    const response = await this.buildGreeting(member, "WELCOME", config);
    this.sendMessage(channel, response, config.autodel);
  }

  isHex(color) {
    return /^#[0-9A-F]{6}$/i.test(color);
  }

  async parse(content, member) {
    const mention = `<@${member.user.id}>`;
    return content
      .replaceAll(/\\n/g, "\n")
      .replaceAll(/{server_name}/g, member.guild.name)
      .replaceAll(/{server_id}/g, member.guild.id)
      .replaceAll(/{server_icon}/g, member.guild.iconURL({ dynamic: true }))
      .replaceAll(/{server_ownerId}/g, member.guild.ownerId)
      .replaceAll(/{server_owner}/g, `<@${member.guild.ownerId}>`)
      .replaceAll(/{server_memberCount}/g, member.guild.memberCount)
      .replaceAll(/{member_count}/g, member.guild.memberCount)
      .replaceAll(/{user_display}/g, member.displayName)
      .replaceAll(
        /{user_avatar}/g,
        member.user.displayAvatarURL({ dynamic: true }),
      )
      .replaceAll(/{user_name}/g, member.user.username)
      .replaceAll(/{user}/g, mention)
      .replaceAll(/{user_id}/g, member.user.id)
      .replaceAll(
        /{user_created:at}/g,
        `<t:${Math.round(member.user.createdTimestamp / 1000)}:R>`,
      );
  }

  async parseDynamicURL(url, member) {
    return url
      .replaceAll(/{server_icon}/g, member.guild.iconURL({ dynamic: true }))
      .replaceAll(
        /{user_icon}/g,
        member.user.displayAvatarURL({ dynamic: true }),
      );
  }

  isValidURL(url) {
    try {
      return Boolean(new URL(url));
    } catch (error) {
      return false;
    }
  }

  async purgeMessages(issuer, channel, type, amount, argument) {
    if (
      !channel
        .permissionsFor(issuer)
        .has(["ManageMessages", "ReadMessageHistory"])
    ) {
      return "MemberPerm";
    }

    if (
      !channel
        .permissionsFor(channel.guild.members.me)
        .has(["ManageMessages", "ReadMessageHistory"])
    ) {
      return "BotPerms";
    }

    try {
      const messages = await channel.messages.fetch({ limit: amount });
      const toDelete = messages.filter((message) => {
        if (!message.deletable) return false;

        switch (type) {
          case "ALL":
            return true;
          case "ATTACHMENT":
            return message.attachments.size > 0;
          case "BOT":
            return message.author.bot;
          case "LINK":
            return /https?:\/\/|discord\.gg\//gi.test(message.content);
          case "TOKEN":
            return message.content.includes(argument);
          case "USER":
            return message.author.id === argument;
          default:
            return false;
        }
      });

      if (toDelete.size === 0) return "NO_MESSAGES";

      await channel.bulkDelete(toDelete, true);
      return toDelete.size;
    } catch (ex) {
      return "ERROR";
    }
  }
};
