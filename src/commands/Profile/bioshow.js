/** @format */

const { v2 } = require("../../utils/v2");
const Profile = require("../../schema/profile");

module.exports = {
  name: "bioshow",
  aliases: ["profileview", "showbio"],
  category: "Profile",
  cooldown: 3,
  description: "Show your or another user's saved profile.",
  execute: async (message, args, client) => {
    const user = message.mentions.users.first() || message.author;
    const userProfile = await Profile.findOne({ User: user.id }).lean();

    const bio = userProfile?.Bio?.trim();
    const socialMedia = userProfile?.SocialMedia || {};
    const socialLinks = [
      formatSocial(client, "twitter", "Twitter", socialMedia.twitter),
      formatSocial(client, "instagram", "Instagram", socialMedia.instagram),
      formatSocial(client, "discord", "Discord", socialMedia.discord),
    ].filter(Boolean);

    const embed = new client.embed()
      .setAuthor({
        name: `${user.username}'s Profile`,
        iconURL: user.displayAvatarURL(),
      })
      .setThumbnail(user.displayAvatarURL({ extension: "png", size: 256 }))
      .addFields(
        {
          name: `${client.emoji.profile || ""} Bio`.trim(),
          value: bio ? `> ${bio}` : "> No bio set.",
          inline: false,
        },
        {
          name: "Social Media",
          value: socialLinks.length
            ? socialLinks.join("\n")
            : "> No social media links set.",
          inline: false,
        },
      );

    return message.reply(v2({ embeds: [embed] }));
  },
};

function formatSocial(client, key, label, value) {
  if (!value?.username?.trim() || !value?.link?.trim()) return null;

  const emoji = key === "instagram"
    ? client.emoji.instagram || client.emoji.insta || ""
    : client.emoji[key] || "";

  return `> ${emoji} **${label}:** [${value.username.trim()}](${value.link.trim()})`;
}
