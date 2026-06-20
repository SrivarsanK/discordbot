/** @format */

const { EmbedBuilder } = require("discord.js");
const { v2 } = require("../../utils/v2");
const { fetchQuestionDetails } = require("../../utils/leetcode");
const LeetcodePostedQuestions = require("../../schema/leetcodePostedQuestions");

module.exports = {
  name: "leetcode-postquestion",
  category: "LeetCode",
  aliases: ["lcpostquestion", "postquestion"],
  cooldown: 5,
  description: "Post and register a LeetCode question to a channel (Admin only)",
  args: true,
  usage: "<leetcode_slug> [#channel]",
  userPerms: ["ManageGuild"],
  botPerms: [],
  owner: false,

  execute: async (message, args, client) => {
    const slug = args[0].trim().toLowerCase();

    // 1. Resolve channel
    let targetChannel = message.channel;
    if (args[1]) {
      const match = args[1].match(/^<#(\d+)>$/) || [null, args[1]];
      const channelId = match[1];
      const chan = message.guild.channels.cache.get(channelId) || 
                   await message.guild.channels.fetch(channelId).catch(() => null);
      if (chan) targetChannel = chan;
    }

    // 2. Fetch question details from LeetCode
    const qDetails = await fetchQuestionDetails(slug);
    if (!qDetails) {
      return message.channel.send(v2({
        embeds: [
          new EmbedBuilder()
            .setDescription(`❌ Could not fetch question details for slug **\`${slug}\`**. Make sure it is the exact URL slug.`)
            .setColor("#ED4245")
        ]
      }));
    }

    const tags = (qDetails.topicTags || []).map(t => t.name);

    // 3. Save to database
    await LeetcodePostedQuestions.updateOne(
      { channelId: targetChannel.id, slug },
      {
        title: qDetails.title,
        difficulty: qDetails.difficulty,
        tags: tags,
        postedAt: new Date()
      },
      { upsert: true }
    );

    // 4. Send announcement embed to the target channel
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
      .setFooter({ text: "Link your account using !register to earn points upon solving!" })
      .setTimestamp();

    await targetChannel.send(v2({ embeds: [announceEmbed] }));

    // Confirm execution to command executor
    if (targetChannel.id !== message.channel.id) {
      message.channel.send(v2({
        embeds: [
          new EmbedBuilder()
            .setDescription(`✅ Successfully registered and announced **${qDetails.title}** in ${targetChannel.toString()}.`)
            .setColor("#57F287")
        ]
      }));
    }
  },
};
