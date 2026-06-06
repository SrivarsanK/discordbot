const { v2 } = require("../../utils/v2");
const { AttachmentBuilder } = require("discord.js");
const Canvacard = require("canvacard");
const Badge = require("../../schema/badge");
const axios = require("axios");
const VoteBypassUserModel = require("../../schema/votebypassuser");
const noprefix = require("../../schema/noprefix");
const Profile = require("../../schema/profile");

module.exports = {
  name: "profile",
  category: "Information",
  aliases: ["pr", "badges", "badge", "bdg"],
  description: "View your or someone else's profile.",
  botPerms: ["EmbedLinks"],
  cooldown: 3,
  execute: async (message, args, client) => {
    const user = message.mentions.users.first() || message.author;
    const member = await message.guild.members.fetch(user.id).catch(() => null);

    const [badgeData, voteBypassUser, noprefixData, userProfile] = await Promise.all([
      Badge.findOne({ userId: user.id }).lean(),
      VoteBypassUserModel.findOne({ userId: user.id }).lean(),
      noprefix.findOne({ userId: user.id }).lean(),
      Profile.findOne({ User: user.id }).lean(),
    ]);

    const badgeLines = buildBadgeLines(client, badgeData?.badge || {}, user.username);
    const premiumLines = [
      `> **Vote Bypass** - ${voteBypassUser ? tick(client) : cross(client)}`,
      `> **No Prefix** - ${noprefixData ? tick(client) : cross(client)}`,
    ];
    const bio = userProfile?.Bio?.trim() || "__None__";
    const socialMedia = buildSocialLinks(client, userProfile?.SocialMedia || {});

    const infoEmbed = new client.embed()
      .setDescription(badgeLines.join("\n"))
      .addFields(
        { name: "Premium", value: premiumLines.join("\n"), inline: false },
        { name: "Bio", value: `> ${bio}`, inline: false },
        { name: "Social Media", value: socialMedia, inline: false },
      )
      .setFooter({
        text: `Profile for ${user.username}`,
        iconURL: user.displayAvatarURL(),
      });

    const profileCard = await buildProfileCard(client, user, member);
    const embeds = [infoEmbed];
    const files = [];

    if (profileCard) {
      files.push(new AttachmentBuilder(profileCard, { name: "profile.png" }));
      embeds.unshift(new client.embed().setImage("attachment://profile.png"));
    }

    return message.channel.send(v2({ embeds, files }));
  },
};

async function buildProfileCard(client, user, member) {
  try {
    const bannerUrl = await fetchBannerUrl(client, user);
    const rank = new Canvacard.Rank(user.id)
      .setAvatar(user.displayAvatarURL({ extension: "png", size: 512 }) || "")
      .setBanner(bannerUrl)
      .setBadges(user.flags?.bitfield || 0, user.bot, true)
      .setStatus(member?.presence?.status || "offline")
      .setProgressBar(["#14C49E", "#FF0000"], "GRADIENT", true)
      .setUsername(user.username, user.discriminator)
      .setCreatedTimestamp(user.createdTimestamp);

    return await rank.build();
  } catch (error) {
    client.logger?.log(
      `[Profile] Failed to build profile card: ${error.stack || error}`,
      "warn",
    );
    return null;
  }
}

async function fetchBannerUrl(client, user) {
  const fallback = user.displayAvatarURL({ extension: "png", size: 4096 });

  try {
    const { data } = await axios.get(`https://discord.com/api/users/${user.id}`, {
      headers: { Authorization: `Bot ${client.token}` },
      timeout: 8000,
    });

    if (!data.banner) return fallback;

    const ext = data.banner.startsWith("a_") ? ".gif" : ".png";
    return `https://cdn.discordapp.com/banners/${user.id}/${data.banner}${ext}?size=4096`;
  } catch (error) {
    client.logger?.log(
      `[Profile] Failed to fetch user banner: ${error.stack || error}`,
      "warn",
    );
    return fallback;
  }
}

function buildBadgeLines(client, badge, username) {
  const lines = [];

  if (badge.dev) lines.push(`> ${emoji(client, "dev")} **Bot Developer**`);
  if (badge.web) lines.push(`> ${emoji(client, "web")} **Web Developer**`);
  if (badge.owner) lines.push(`> ${emoji(client, "owner")} **Owner**`);
  if (badge.admin) lines.push(`> ${emoji(client, "admin")} **Admin**`);
  if (badge.staff) lines.push(`> ${emoji(client, "staff")} **Staff**`);
  if (badge.partner) lines.push(`> ${emoji(client, "partner")} **Partner**`);
  if (badge.supporter) lines.push(`> ${emoji(client, "supporter")} **Early Supporter**`);
  if (badge.sponsor) lines.push(`> ${emoji(client, "sponsor")} **Sponsor**`);
  if (badge.ownerspecial) lines.push(`> ${emoji(client, "ownerspecial")} **Owner Special**`);
  if (badge.specialone) lines.push(`> ${emoji(client, "specialone")} **Special One**`);
  if (badge.loveone) lines.push(`> ${emoji(client, "loveone")} **Love One**`);
  if (badge.vip) lines.push(`> ${emoji(client, "vip")} **VIP**`);
  if (badge.friend) lines.push(`> ${emoji(client, "friend")} **Friend**`);
  if (badge.bug) lines.push(`> ${emoji(client, "bug")} **Bug Hunter**`);
  if (badge.noprefix) lines.push(`> ${emoji(client, "noprefix")} **No Prefix**`);

  return lines.length ? lines : [`> **${username}** does not have any badges yet.`];
}

function buildSocialLinks(client, socialMedia) {
  const links = [
    formatSocial(client, "twitter", "Twitter", socialMedia.twitter),
    formatSocial(client, "instagram", "Instagram", socialMedia.instagram),
    formatSocial(client, "discord", "Discord", socialMedia.discord),
  ].filter(Boolean);

  return links.length ? links.join("\n") : "> No social media links set.";
}

function formatSocial(client, key, label, value) {
  if (!value?.username?.trim() || !value?.link?.trim()) return null;

  return `> ${socialEmoji(client, key)} **${label}:** [${value.username.trim()}](${value.link.trim()})`;
}

function socialEmoji(client, key) {
  if (key === "instagram") return client.emoji.instagram || client.emoji.insta || "";
  return client.emoji[key] || "";
}

function tick(client) {
  return client.emoji.tick || "Yes";
}

function cross(client) {
  return client.emoji.cross || "No";
}

function emoji(client, key) {
  return client.emoji[key] || "";
}
