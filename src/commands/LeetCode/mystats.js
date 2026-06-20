/** @format */

const { EmbedBuilder } = require("discord.js");
const { v2 } = require("../../utils/v2");
const LeetcodeUsers = require("../../schema/leetcodeUsers");
const LeetcodePostedQuestions = require("../../schema/leetcodePostedQuestions");
const LeetcodeSolves = require("../../schema/leetcodeSolves");

module.exports = {
  name: "mystats",
  category: "LeetCode",
  aliases: ["lcstats", "lc-stats", "stats-lc", "lcs"],
  cooldown: 5,
  description: "View LeetCode solved problems statistics",
  args: false,
  usage: "[@user|user_id]",
  userPerms: [],
  botPerms: [],
  owner: false,

  execute: async (message, args, client) => {
    const guildId = message.guild.id;

    // 1. Resolve target user
    let targetUser = message.author;
    if (args.length > 0) {
      const resolved = message.mentions.users.first() || 
                       await client.users.fetch(args[0]).catch(() => null);
      if (resolved) targetUser = resolved;
    }

    // 2. Check if user is bound
    const userBind = await LeetcodeUsers.findOne({ discordId: targetUser.id });
    if (!userBind) {
      return message.channel.send(v2({
        embeds: [
          new EmbedBuilder()
            .setDescription(targetUser.id === message.author.id
              ? `❌ You haven't linked your LeetCode account. Link it using **\`${message.prefix || "!"}register <leetcode_username>\`**.`
              : `❌ **${targetUser.tag}** has not linked their LeetCode account.`)
            .setColor("#ED4245")
        ]
      }));
    }

    // 3. Fetch user solves
    const userSolves = await LeetcodeSolves.find({ guildId, discordId: targetUser.id });
    const totalSolves = userSolves.length;

    // 4. Calculate difficulty breakdown and points
    let points = 0;
    let easyCount = 0;
    let mediumCount = 0;
    let hardCount = 0;

    userSolves.forEach(solve => {
      points += solve.pointsAwarded;
      const diff = (solve.difficulty || "Easy").toLowerCase();
      if (diff === "easy") easyCount++;
      else if (diff === "medium") mediumCount++;
      else if (diff === "hard") hardCount++;
    });

    // 5. Calculate Guild Rank
    const allSolves = await LeetcodeSolves.find({ guildId });
    const userPointsMap = {};
    allSolves.forEach(s => {
      userPointsMap[s.discordId] = (userPointsMap[s.discordId] || 0) + s.pointsAwarded;
    });

    // Make sure we include our user if they have solves but aren't in allSolves somehow
    if (totalSolves > 0 && !userPointsMap[targetUser.id]) {
      userPointsMap[targetUser.id] = points;
    }

    const leaderboardSorted = Object.entries(userPointsMap)
      .map(([id, pts]) => ({ id, pts }))
      .sort((a, b) => b.pts - a.pts);

    const rankIdx = leaderboardSorted.findIndex(item => item.id === targetUser.id);
    const rankStr = rankIdx !== -1 ? `#${rankIdx + 1}` : "*Unranked*";

    // 6. Calculate Solves by Category
    const solvedSlugs = userSolves.map(s => s.slug);
    const categoryCounts = {};
    if (solvedSlugs.length > 0) {
      const questions = await LeetcodePostedQuestions.find({ slug: { $in: solvedSlugs } });
      questions.forEach(q => {
        const tags = Array.isArray(q.tags) ? q.tags : [];
        tags.forEach(tag => {
          categoryCounts[tag] = (categoryCounts[tag] || 0) + 1;
        });
      });
    }

    const categoryListStr = Object.entries(categoryCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([cat, count]) => `• **${cat}**: ${count} solved`)
      .join("\n") || "*None*";

    // 7. Recent solve history
    const recentSolves = [...userSolves]
      .sort((a, b) => {
        const dateA = a.solvedAt instanceof Date ? a.solvedAt.getTime() : Number(a.solvedAt);
        const dateB = b.solvedAt instanceof Date ? b.solvedAt.getTime() : Number(b.solvedAt);
        return dateB - dateA;
      })
      .slice(0, 5)
      .map(s => {
        const date = s.solvedAt instanceof Date ? s.solvedAt : new Date(Number(s.solvedAt));
        return `• **[${s.title}](https://leetcode.com/problems/${s.slug}/)** (${s.difficulty}) - <t:${Math.floor(date.getTime() / 1000)}:R>`;
      })
      .join("\n") || "*No recent solves*";

    // 8. Build stats embed
    const embed = new EmbedBuilder()
      .setTitle(`📊 LeetCode Stats: ${targetUser.username}`)
      .setDescription(`Linked Account: **[${userBind.lcUsername}](https://leetcode.com/${userBind.lcUsername})**`)
      .addFields(
        { name: "🏆 Guild Rank", value: `**${rankStr}**`, inline: true },
        { name: "⚡ Total Points", value: `**${points}** XP`, inline: true },
        { name: "✅ Solved Problems", value: `**${totalSolves}** solves`, inline: true },
        
        { 
          name: "📈 Difficulty Breakdown", 
          value: `🟢 Easy: **${easyCount}**\n🟡 Medium: **${mediumCount}**\n🔴 Hard: **${hardCount}**`, 
          inline: true 
        },
        { 
          name: "🏷️ Top Categories", 
          value: categoryListStr, 
          inline: true 
        },
        { 
          name: "🕒 Recent Solves", 
          value: recentSolves, 
          inline: false 
        }
      )
      .setColor(client.embedColor || "#5865F2")
      .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
      .setTimestamp();

    message.channel.send(v2({ embeds: [embed] }));
  },
};
