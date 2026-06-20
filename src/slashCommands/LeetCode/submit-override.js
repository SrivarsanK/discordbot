/** @format */

const { EmbedBuilder, ApplicationCommandOptionType } = require("discord.js");
const { v2 } = require("../../utils/v2");
const LeetcodePostedQuestions = require("../../schema/leetcodePostedQuestions");
const LeetcodeSolves = require("../../schema/leetcodeSolves");
const LeetcodeServerConfig = require("../../schema/leetcodeServerConfig");
const LeetcodeUsers = require("../../schema/leetcodeUsers");

module.exports = {
  name: "submit-override",
  description: "Manually credit a challenge solve for a user (Admin only)",
  options: [
    {
      name: "user",
      description: "The user to credit",
      type: ApplicationCommandOptionType.User,
      required: true
    },
    {
      name: "slug",
      description: "The LeetCode slug (optional, defaults to active channel challenge)",
      type: ApplicationCommandOptionType.String,
      required: false
    }
  ],

  run: async (client, interaction) => {
    // 1. Permission check
    if (!interaction.member.permissions.has("Administrator")) {
      return interaction.reply(v2({
        embeds: [
          new EmbedBuilder()
            .setDescription("❌ You must be an Administrator to run this command.")
            .setColor("#ED4245")
        ],
        ephemeral: true
      }));
    }

    await interaction.deferReply({ ephemeral: true });

    const targetUser = interaction.options.getUser("user");
    const inputSlug = interaction.options.getString("slug")?.trim().toLowerCase();

    // 2. Check if user is linked to LeetCode
    const linkedUser = await LeetcodeUsers.findOne({ discordId: targetUser.id });
    if (!linkedUser) {
      return interaction.editReply(v2({
        embeds: [
          new EmbedBuilder()
            .setDescription(`❌ User **${targetUser.username}** has not linked their LeetCode profile yet.`)
            .setColor("#ED4245")
        ]
      }));
    }

    let targetQuestion = null;

    if (inputSlug) {
      // Find question by slug in the database
      const questions = await LeetcodePostedQuestions.find({ slug: inputSlug });
      if (!questions || questions.length === 0) {
        return interaction.editReply(v2({
          embeds: [
            new EmbedBuilder()
              .setDescription(`❌ No posted challenge found matching the slug **"${inputSlug}"**.`)
              .setColor("#ED4245")
          ]
        }));
      }
      targetQuestion = questions.sort((a, b) => b.postedAt - a.postedAt)[0];
    } else {
      // Find active question in this channel
      const questions = await LeetcodePostedQuestions.find({ channelId: interaction.channelId });
      if (!questions || questions.length === 0) {
        return interaction.editReply(v2({
          embeds: [
            new EmbedBuilder()
              .setDescription("❌ No LeetCode challenges have been posted in this channel. Please specify a challenge `slug` option.")
              .setColor("#ED4245")
          ]
        }));
      }
      targetQuestion = questions.sort((a, b) => b.postedAt - a.postedAt)[0];
    }

    // 3. Check if user already solved it
    const alreadySolved = await LeetcodeSolves.findOne({
      guildId: interaction.guildId,
      discordId: targetUser.id,
      slug: targetQuestion.slug
    });

    if (alreadySolved) {
      return interaction.editReply(v2({
        embeds: [
          new EmbedBuilder()
            .setDescription(`ℹ️ **${targetUser.username}** has already been credited for solving **${targetQuestion.title}**.`)
            .setColor("#5865F2")
        ]
      }));
    }

    // 4. Record solve
    const serverConfig = await LeetcodeServerConfig.findOne({ guildId: interaction.guildId }) || {};
    const points = targetQuestion.difficulty === "Easy" ? (serverConfig.pointsEasy ?? 10) :
                   targetQuestion.difficulty === "Medium" ? (serverConfig.pointsMedium ?? 20) :
                   (serverConfig.pointsHard ?? 30);

    await LeetcodeSolves.create({
      guildId: interaction.guildId,
      discordId: targetUser.id,
      slug: targetQuestion.slug,
      title: targetQuestion.title,
      difficulty: targetQuestion.difficulty,
      pointsAwarded: points,
      solvedAt: new Date()
    });

    // Confirmation reply
    const successEmbed = new EmbedBuilder()
      .setTitle("✅ Solve Manually Credited")
      .setDescription(`Successfully credited **${targetQuestion.title}** to **${targetUser}** (earned **${points} points**).`)
      .setColor("#57F287");

    await interaction.editReply(v2({ embeds: [successEmbed] }));

    // Post shoutout in server if shoutout channel is set
    const shoutoutChannelId = serverConfig.shoutoutChannelId;
    if (shoutoutChannelId) {
      const shoutoutChannel = interaction.guild.channels.cache.get(shoutoutChannelId) || 
                              await interaction.guild.channels.fetch(shoutoutChannelId).catch(() => null);
      if (shoutoutChannel) {
        const shoutoutEmbed = new EmbedBuilder()
          .setTitle("🏆 Challenge Solved (Override)")
          .setDescription(`**${targetUser}** has been manually credited for daily challenge:\n**[${targetQuestion.title}](https://leetcode.com/problems/${targetQuestion.slug})** (${targetQuestion.difficulty})\n\nEarned: **${points} points**!`)
          .setColor("#FEE75C")
          .setTimestamp();
        
        await shoutoutChannel.send(v2({ embeds: [shoutoutEmbed] })).catch(err => {
          console.error(`[LeetCode Submit-Override] Failed to send shoutout:`, err.message);
        });
      }
    }
  }
};
