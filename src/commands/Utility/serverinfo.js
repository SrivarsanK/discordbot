const { v2 } = require("../../utils/v2");
const verificationLevels = {
  0: "None",
  1: "Low",
  2: "Medium",
  3: "High",
  4: "Very High",
};
const booster = { 0: "Level: 0", 1: "Level: 1", 2: "Level: 2", 3: "Level: 3" };
const upload = { 0: "8.00 MB", 1: "8.00 MB", 2: "50.00 MB", 3: "100.00 MB" };
const {
  EmbedBuilder,
  MessageFlags,
  ButtonBuilder,
  ActionRowBuilder,
  ButtonStyle,
  ChannelType,
} = require("discord.js");

module.exports = {
  name: "serverinfo",
  category: "Utility",
  cooldown: 3,
  aliases: ["si", "sinfo"],
  description: "to know server information",
  args: false,
  usage: "",
  userPerms: [],
  owner: false,
  execute: async (message, args, client, prefix) => {
    const disabled = client.emoji.cross;
    const enabled = client.emoji.tick;

    this.client = client;
    const guild = message.guild;
    const { createdTimestamp, ownerId, description } = guild;
    function checkDays(date) {
      const now = new Date();
      const diff = now.getTime() - date.getTime();
      const days = Math.floor(diff / 86400000);
      return days + (days == 1 ? " day" : " days") + " ago";
    }
    let mfilter = "";
    if (message.guild.explicitContentFilter === 0) {
      mfilter = `${disabled}`;
    }
    if (message.guild.explicitContentFilter === 1) {
      mfilter = "Members Without Roles";
    }
    if (message.guild.explicitContentFilter === 2) {
      mfilter = "All Members";
    }
    let nsfw = "";
    if (message.guild.nsfwLevel === 0) {
      nsfw = "Default";
    }
    if (message.guild.nsfwLevel === 1) {
      nsfw = "Explicit";
    }
    if (message.guild.nsfwLevel === 2) {
      nsfw = "Safe";
    }
    if (message.guild.nsfwLevel === 3) {
      nsfw = "Age Restricted";
    }

    let features = "";
    if (message.guild.features.includes("ANIMATED_BANNER"))
      features += `\n ${enabled}: Antimated Banner`;
    if (message.guild.features.includes("ANTIMATED_ICON"))
      features += `\n${enabled}: Animated Icon`;
    if (message.guild.features.includes("APPLICATION_COMMAND_PERMISSIONS_V2"))
      features += `\n${enabled}: Application Commands Permissions V2`;
    if (message.guild.features.includes("BANNER"))
      features += `\n${enabled}: Banner`;
    if (message.guild.features.includes("AUTO_MODERATION"))
      features += `\n ${enabled}: Auto Moderation`;
    if (message.guild.features.includes("COMMUNITY"))
      features += `\n${enabled}: Community`;
    if (message.guild.features.includes("DEVELOPER_SUPPORT_SERVER"))
      features += `\n${enabled}: Developer Support Server`;
    if (message.guild.features.includes("DISCOVERABLE"))
      features += `\n${enabled}: Discoverable`;
    if (message.guild.features.includes("FEATURABLE"))
      features += `\n${enabled}: Featurable`;
    if (message.guild.features.includes("INVITES_DISABLED"))
      features += `\n$${enabled}: Invites Disabled`;
    if (message.guild.features.includes("INVITE_SPLASH"))
      features += `\n${enabled}: Invite Splash`;
    if (message.guild.features.includes("MEMBER_VERIFICATION_GATE_ENABLED"))
      features += `\n${enabled}: Member Verification Gate Enabled`;
    if (message.guild.features.includes("MONETIZATION_ENABLED"))
      features += `\n${enabled}: Monetization Enabled`;
    if (message.guild.features.includes("MORE_STCIKERS"))
      features += `\n${enabled}: More Stickers`;
    if (message.guild.features.includes("NEWS"))
      features += `\n${enabled}: News`;
    if (message.guild.features.includes("PARTNERED"))
      features += `\n${enabled}: Partnered`;
    if (message.guild.features.includes("PREVIEW_ENABLED"))
      features += `\n${enabled}: Preview Enabled`;
    if (message.guild.features.includes("ROLE_ICONS"))
      features += `\n${enabled}: Role Icons`;
    if (message.guild.features.includes("TICKETED_EVENTS_ENABLED"))
      features += `\n${enabled}: Ticketed Events Enabled`;
    if (message.guild.features.includes("VANITY_URL"))
      features += `\n${enabled}: Vanity URL`;
    if (message.guild.features.includes("VERIFIED"))
      features += `\n${enabled}: Verified`;
    if (message.guild.features.includes("VIP_REGIONS"))
      features += `\n${enabled}: Vip Regions`;
    if (message.guild.features.includes("WELCOME_SCREEN_ENABLED"))
      features += `\n${enabled}: Welcome Screen Enabled`;
    if (features === "") features += `\nNo features`;
    const roles = guild.roles.cache
      .sort((a, b) => b.position - a.position)
      .map((role) => role.toString())
      .slice(0, -1);
    let msg = "";
    if (message.guild.defaultMessageNotifications === `ALL_MESSAGES`) {
      msg = `All Messages`;
    } else {
      msg = `Only mentions`;
    }
    let mfa = "";
    if (message.guild.mfaLevel === `ELEVATED`) mfa = `${enabled}`;
    else {
      mfa = `${disabled}`;
    }
    let rolesdisplay;
    if (roles.length < 15) {
      rolesdisplay = roles.join(" ");
      if (roles.length < 1) rolesdisplay = "None";
    } else {
      rolesdisplay = `\`Too many roles to show..\``;
    }
    if (rolesdisplay.length > 1024)
      rolesdisplay = `${roles.slice(4).join(" ")} \`more..\``;
    const members = guild.members.cache;
    const channels = guild.channels.cache;
    const emojis = guild.emojis.cache;
    const emoji1 = `**Regular :** ${emojis.filter((emoji) => !emoji.animated).size}/50\n**Animated :** ${emojis.filter((emoji) => emoji.animated).size}/50\n**Total :** ${emojis.size}/100`;
    const emoji2 = `**Regular :** ${emojis.filter((emoji) => !emoji.animated).size}/50\n**Animated :** ${emojis.filter((emoji) => emoji.animated).size}/50\n**Total :** ${emojis.size}/100`;
    const emoji3 = `**Regular :** ${emojis.filter((emoji) => !emoji.animated).size}/150\n**Animated :** ${emojis.filter((emoji) => emoji.animated).size}/150\n**Total :** ${emojis.size}/300`;
    const emoji4 = `**Regular :** ${emojis.filter((emoji) => !emoji.animated).size}/250\n**Animated :** ${emojis.filter((emoji) => emoji.animated).size}/250\n**Total :** ${emojis.size}/500`;

    let emoji = "";
    if (guild.premiumTier === 0) {
      emoji = `${emoji1}`;
    }
    if (guild.premiumTier === 1) {
      emoji = `${emoji2}`;
    }
    if (guild.premiumTier === 2) {
      emoji = `${emoji3}`;
    }
    if (guild.premiumTier === 3) {
      emoji = `${emoji4}`;
    }

    const data = guild.bannerURL;
    if (data) {
      return message.reply(v2({
        embeds: [
          new client.embed()
            .t(`${guild.name}'s Information`)
            .thumb(guild.iconURL({ dynamic: true }))
            .img(guild.bannerURL({ size: 4096 }))
            .addFields([
              {
                name: "__About__",
                value: `**Name :** ${guild.name} \n**ID :** ${guild.id} \n**Owner ${client.emoji.owner} :** <@!${guild.ownerId}> (${guild.ownerId})\n**Created at :** <t:${parseInt(createdTimestamp / 1000)}:R>\n**Members :** ${guild.members.cache.size}\n**Description :** ${message.guild.description ? message.guild.description : "No Description set."}`,
              },
              {
                name: "__Server Information__",
                value: `**Verification Level :** ${verificationLevels[guild.verificationLevel]}\n**Upload Limit :** ${upload[guild.premiumTier]}\n**NSFW Level :** ${nsfw}\n**Default Notifications :** ${msg}\n**Inactive Timeout : **${guild.afkTimeout / 60} mins\n**Inactive Channel : **${guild.afkChannelId ? `<#${guild.afkChannelId}>` : `${disabled}`}\n**System Messages Channel : **${guild.systemChannelId ? `<#${guild.systemChannelId}>` : `${disabled}`}\n**Explicit Media Content Filter :** ${mfilter}\n**Boost Bar Enabled : **${guild.premiumProgressBarEnabled ? enabled : disabled}\n**2FA Requirement :** ${mfa}`,
              },
              {
                name: "__Features__",
                value: `${features}`,
              },
              {
                name: "__Channels__",
                value: `**Total : ** ${channels.size}\n**Channels :** ${client.emoji.queue} ${channels.filter((channel) => channel.type === ChannelType.GuildText || channel.type === ChannelType.GuildForum || channel.type === ChannelType.GuildAnnouncement).size} | ${client.emoji.volumehigh} ${channels.filter((channel) => channel.type === ChannelType.GuildVoice || channel.type === ChannelType.GuildStageVoice).size} | ${client.emoji.config} ${channels.filter((channel) => channel.type === ChannelType.GuildCategory).size}\n**Rules Channel :**  ${guild.rulesChannelId ? `<#${guild.rulesChannelId}>` : `${disabled}`}`,
              },
              {
                name: "__Emoji Info__",
                value: `${emoji}`,
              },
              {
                name: "__Boost Status__",
                value: `${booster[guild.premiumTier]} [${client.emoji.dot} ${guild.premiumSubscriptionCount || "0"} Boosts]`,
              },
              {
                name: `__Server Roles__ [${roles.length}]`,
                value: `${rolesdisplay}`,
              },
            ])

            .setFooter({
              text: `Requested by ` + message.author.tag,
              iconURL: message.author.displayAvatarURL(),
            }),
        ],
      }));
    }
  },
};
