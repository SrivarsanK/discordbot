/** @format */

const { EmbedBuilder, ApplicationCommandOptionType } = require("discord.js");
const { v2 } = require("../../utils/v2");
const { fetchLeetcodeUser } = require("../../utils/leetcode");
const LeetcodeUsers = require("../../schema/leetcodeUsers");
const LeetcodePending = require("../../schema/leetcodePending");

module.exports = {
  name: "register",
  description: "Link your LeetCode account to your Discord account",
  options: [
    {
      name: "username",
      description: "Your LeetCode username",
      type: ApplicationCommandOptionType.String,
      required: true,
    }
  ],

  run: async (client, interaction) => {
    await interaction.deferReply();
    const username = interaction.options.getString("username").trim();

    // 1. Check if user exists on LeetCode
    const lcUser = await fetchLeetcodeUser(username);
    if (!lcUser) {
      return interaction.editReply(v2({
        embeds: [
          new EmbedBuilder()
            .setDescription(`❌ LeetCode user **${username}** does not exist or has a private profile. Please verify your username.`)
            .setColor("#ED4245")
        ]
      }));
    }

    const officialUsername = lcUser.username;

    // 2. Check if username is already bound to another Discord account
    const existing = await LeetcodeUsers.findOne({ lcUsername: officialUsername });
    if (existing) {
      const isSelf = existing.discordId === interaction.user.id;
      return interaction.editReply(v2({
        embeds: [
          new EmbedBuilder()
            .setDescription(isSelf 
              ? `ℹ️ You are already bound to LeetCode account **${officialUsername}**.` 
              : `❌ LeetCode username **${officialUsername}** is already linked to another Discord account.`)
            .setColor(isSelf ? "#5865F2" : "#ED4245")
        ]
      }));
    }

    // 3. Generate token
    const randomChars = Math.random().toString(36).substring(2, 8).toUpperCase();
    const token = `DSCRD-${randomChars}`;
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    // 4. Save to pending table
    await LeetcodePending.updateOne(
      { discordId: interaction.user.id },
      { lcUsername: officialUsername, token, expiresAt },
      { upsert: true }
    );

    // 5. Send instructions
    const embed = new EmbedBuilder()
      .setTitle("🔒 Link Your LeetCode Account")
      .setDescription(
        `Please follow these instructions to verify you own the LeetCode profile **${officialUsername}**:\n\n` +
        `1. Go to your [LeetCode Profile Settings](https://leetcode.com/profile/).\n` +
        `2. Paste the following verification token into your **'README'** section:\n` +
        `   \`\`\`${token}\`\`\`\n` +
        `3. Run the **\`/verify\`** slash command within 15 minutes to complete the link.\n\n` +
        `*You can safely remove the token from your profile README after successful verification.*`
      )
      .setColor("#FEE75C")
      .setThumbnail("https://assets.leetcode.com/users/default_avatar.jpg")
      .setFooter({ text: "Token expires in 15 minutes." });

    interaction.editReply(v2({ embeds: [embed] }));
  },
};
