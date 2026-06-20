/** @format */

const { EmbedBuilder } = require("discord.js");
const { v2 } = require("../../utils/v2");
const { fetchLeetcodeUserData, checkVerifyCooldown } = require("../../utils/leetcode");
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

    // 3. Re-query LeetCode profile aboutMe and statistics
    const userData = await fetchLeetcodeUserData(pending.lcUsername);
    if (!userData || !userData.matchedUser || !userData.matchedUser.profile) {
      return interaction.editReply(v2({
        embeds: [
          new EmbedBuilder()
            .setDescription(`❌ Error fetching your LeetCode profile. Please check if your profile is private or try again later.`)
            .setColor("#ED4245")
        ]
      }));
    }

    const aboutMe = userData.matchedUser.profile.aboutMe || "";
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
    const stats = userData.matchedUser.submitStatsGlobal?.acSubmissionNum || [];
    const solvedEasy = stats.find(s => s.difficulty === "Easy")?.count || 0;
    const solvedMedium = stats.find(s => s.difficulty === "Medium")?.count || 0;
    const solvedHard = stats.find(s => s.difficulty === "Hard")?.count || 0;

    await LeetcodeUsers.updateOne(
      { discordId: interaction.user.id },
      { 
        lcUsername: pending.lcUsername, 
        boundAt: new Date(),
        solvedEasy,
        solvedMedium,
        solvedHard,
        lastUpdated: new Date()
      },
      { upsert: true }
    );
    await LeetcodePending.deleteOne({ discordId: interaction.user.id });

    const successEmbed = new EmbedBuilder()
      .setTitle("✅ Verification Successful!")
      .setDescription(`Your Discord account is now linked to LeetCode profile **[${pending.lcUsername}](https://leetcode.com/${pending.lcUsername})**!\n\nWe will now track your solves for bot-posted problems. You may remove the token from your biography.`)
      .setColor("#57F287")
      .setThumbnail(userData.matchedUser.profile.userAvatar || "https://assets.leetcode.com/users/default_avatar.jpg");

    interaction.editReply(v2({ embeds: [successEmbed] }));
  },
};
