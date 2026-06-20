/** @format */

const { EmbedBuilder } = require("discord.js");
const { v2 } = require("../../utils/v2");
const { fetchLeetcodeUser, checkVerifyCooldown } = require("../../utils/leetcode");
const LeetcodeUsers = require("../../schema/leetcodeUsers");
const LeetcodePending = require("../../schema/leetcodePending");

module.exports = {
  name: "verify",
  description: "Verify and complete LeetCode account linking",
  options: [],

  run: async (client, interaction) => {
    // 1. Rate limiting check (10 seconds)
    const cooldownLeft = checkVerifyCooldown(interaction.user.id);
    if (cooldownLeft > 0) {
      return interaction.reply(v2({
        embeds: [
          new EmbedBuilder()
            .setDescription(`⚠️ Rate limit: Please wait **${cooldownLeft}s** before trying to verify again.`)
            .setColor("#ED4245")
        ],
        ephemeral: true
      }));
    }

    await interaction.deferReply();

    // 2. Fetch pending verification record
    const pending = await LeetcodePending.findOne({ discordId: interaction.user.id });
    if (!pending) {
      return interaction.editReply(v2({
        embeds: [
          new EmbedBuilder()
            .setDescription(`❌ You have no pending registration. Run the **\`/register <leetcode_username>\`** command first.`)
            .setColor("#ED4245")
        ]
      }));
    }

    const expiresAt = pending.expiresAt instanceof Date ? pending.expiresAt.getTime() : Number(pending.expiresAt);
    if (expiresAt < Date.now()) {
      return interaction.editReply(v2({
        embeds: [
          new EmbedBuilder()
            .setDescription(`❌ Your pending registration has expired. Please run **\`/register\`** again.`)
            .setColor("#ED4245")
        ]
      }));
    }

    // 3. Re-query LeetCode profile aboutMe
    const lcUser = await fetchLeetcodeUser(pending.lcUsername);
    if (!lcUser || !lcUser.profile) {
      return interaction.editReply(v2({
        embeds: [
          new EmbedBuilder()
            .setDescription(`❌ Error fetching your LeetCode profile. Please check if your profile is private or try again later.`)
            .setColor("#ED4245")
        ]
      }));
    }

    const aboutMe = lcUser.profile.aboutMe || "";
    const token = pending.token;

    // 4. Exact substring match of token
    if (!aboutMe.includes(token)) {
      return interaction.editReply(v2({
        embeds: [
          new EmbedBuilder()
            .setTitle("❌ Verification Failed")
            .setDescription(
              `Could not find your verification token in your LeetCode biography.\n\n` +
              `• **Target Token**: \`${token}\`\n` +
              `• **LeetCode Profile**: [Link Profile](https://leetcode.com/${pending.lcUsername})\n\n` +
              `Please ensure you pasted the token into your **'Summary / About Me'** section on your LeetCode profile settings and saved the changes, then try running **\`/verify\`** again.`
            )
            .setColor("#ED4245")
        ]
      }));
    }

    // 5. Successful match: delete pending, create permanent user binding
    await LeetcodeUsers.updateOne(
      { discordId: interaction.user.id },
      { lcUsername: pending.lcUsername, boundAt: new Date() },
      { upsert: true }
    );
    await LeetcodePending.deleteOne({ discordId: interaction.user.id });

    const successEmbed = new EmbedBuilder()
      .setTitle("✅ Verification Successful!")
      .setDescription(`Your Discord account is now linked to LeetCode profile **[${pending.lcUsername}](https://leetcode.com/${pending.lcUsername})**!\n\nWe will now track your solves for bot-posted problems. You may remove the token from your biography.`)
      .setColor("#57F287")
      .setThumbnail(lcUser.profile.userAvatar || "https://assets.leetcode.com/users/default_avatar.jpg");

    interaction.editReply(v2({ embeds: [successEmbed] }));
  },
};
