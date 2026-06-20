/** @format */

const { EmbedBuilder, ApplicationCommandOptionType } = require("discord.js");
const { v2 } = require("../../utils/v2");
const { fetchQuestionDetails } = require("../../utils/leetcode");
const LeetcodePostedQuestions = require("../../schema/leetcodePostedQuestions");

module.exports = {
  name: "leetcode-postquestion",
  description: "Post and register a LeetCode question (Admin only)",
  userPrams: ["ManageGuild"],
  options: [
    {
      name: "slug",
      description: "The URL slug of the LeetCode problem (e.g. 'two-sum')",
      type: ApplicationCommandOptionType.String,
      required: true,
    },
    {
      name: "channel",
      description: "The channel to post the question in (defaults to current)",
      type: ApplicationCommandOptionType.Channel,
      required: false,
    }
  ],

  run: async (client, interaction) => {
    await interaction.deferReply();
    const slug = interaction.options.getString("slug").trim().toLowerCase();
    const targetChannel = interaction.options.getChannel("channel") || interaction.channel;

    // 1. Fetch question details from LeetCode
    const qDetails = await fetchQuestionDetails(slug);
    if (!qDetails) {
      return interaction.editReply(v2({
        embeds: [
          new EmbedBuilder()
            .setDescription(`❌ Could not fetch question details for slug **\`${slug}\`**. Make sure it is the exact URL slug.`)
            .setColor("#ED4245")
        ]
      }));
    }

    const tags = (qDetails.topicTags || []).map(t => t.name);

    // 2. Save to database (using check-and-create due to composite key upsert limitations)
    const existing = await LeetcodePostedQuestions.findOne({ channelId: targetChannel.id, slug });
    if (existing) {
      await LeetcodePostedQuestions.updateOne(
        { channelId: targetChannel.id, slug },
        {
          title: qDetails.title,
          difficulty: qDetails.difficulty,
          tags: tags,
          postedAt: new Date()
        }
      );
    } else {
      await LeetcodePostedQuestions.create({
        channelId: targetChannel.id,
        slug,
        title: qDetails.title,
        difficulty: qDetails.difficulty,
        tags: tags,
        postedAt: new Date()
      });
    }

    // 3. Send announcement embed to the target channel
    let diffEmoji = "🟢 Easy";
    let diffColor = "#57F287"; // Green
    const diff = qDetails.difficulty.toLowerCase();
    if (diff === "medium") {
      diffEmoji = "🟡 Medium";
      diffColor = "#FEE75C"; // Yellow
    } else if (diff === "hard") {
      diffEmoji = "🔴 Hard";
      diffColor = "#ED4245"; // Red
    }

    const announceEmbed = new EmbedBuilder()
      .setTitle(`📚 New LeetCode Question Posted!`)
      .setDescription(`### **[${qDetails.title}](https://leetcode.com/problems/${slug}/)**`)
      .addFields(
        { name: "Difficulty", value: diffEmoji, inline: true },
        { name: "Tags", value: tags.length > 0 ? tags.map(t => `\`${t}\``).join(", ") : "*None*", inline: true }
      )
      .setColor(diffColor)
      .setThumbnail("https://assets.leetcode.com/users/default_avatar.jpg")
      .setFooter({ text: "Link your account using /register to earn points upon solving!" })
      .setTimestamp();

    await targetChannel.send(v2({ embeds: [announceEmbed] }));

    // Confirm execution to command executor
    const confirmEmbed = new EmbedBuilder()
      .setDescription(`✅ Successfully registered and announced **${qDetails.title}** in ${targetChannel.toString()}.`)
      .setColor("#57F287");

    interaction.editReply(v2({ embeds: [confirmEmbed] }));
  },
};
