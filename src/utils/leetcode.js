/** @format */

const axios = require("axios");
const { EmbedBuilder, MessageFlags } = require("discord.js");
const { v2 } = require("./v2");

const LeetcodeUsers = require("../schema/leetcodeUsers");
const LeetcodePending = require("../schema/leetcodePending");
const LeetcodePostedQuestions = require("../schema/leetcodePostedQuestions");
const LeetcodeSolves = require("../schema/leetcodeSolves");
const LeetcodeServerConfig = require("../schema/leetcodeServerConfig");

const LEETCODE_GQL_URL = "https://leetcode.com/graphql";
const HEADERS = {
  "Content-Type": "application/json",
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36"
};

/**
 * Fetch LeetCode user profile info.
 * Returns null if user does not exist.
 */
async function fetchLeetcodeUser(username) {
  const query = `
    query getUserProfile($username: String!) {
      matchedUser(username: $username) {
        username
        profile {
          aboutMe
          userAvatar
          reputation
        }
      }
    }
  `;

  try {
    const response = await axios.post(LEETCODE_GQL_URL, {
      query,
      variables: { username }
    }, { headers: HEADERS });

    return response.data?.data?.matchedUser || null;
  } catch (error) {
    console.error(`[LeetCode API] Error fetching user ${username}:`, error.message);
    return null;
  }
}

/**
 * Fetch recent accepted submissions for a user.
 */
async function fetchRecentAcSubmissions(username, limit = 15) {
  const query = `
    query getRecentAcSubmissions($username: String!, $limit: Int!) {
      recentAcSubmissionList(username: $username, limit: $limit) {
        id
        title
        titleSlug
        timestamp
      }
    }
  `;

  try {
    const response = await axios.post(LEETCODE_GQL_URL, {
      query,
      variables: { username, limit }
    }, { headers: HEADERS });

    return response.data?.data?.recentAcSubmissionList || [];
  } catch (error) {
    console.error(`[LeetCode API] Error fetching submissions for ${username}:`, error.message);
    return [];
  }
}

/**
 * Fetch details of a specific problem.
 */
async function fetchQuestionDetails(titleSlug) {
  const query = `
    query getQuestionDetails($titleSlug: String!) {
      question(titleSlug: $titleSlug) {
        title
        difficulty
        topicTags {
          name
          slug
        }
      }
    }
  `;

  try {
    const response = await axios.post(LEETCODE_GQL_URL, {
      query,
      variables: { titleSlug }
    }, { headers: HEADERS });

    return response.data?.data?.question || null;
  } catch (error) {
    console.error(`[LeetCode API] Error fetching question ${titleSlug}:`, error.message);
    return null;
  }
}

/**
 * Main polling logic to check solves for all bound users.
 */
async function checkSolves(client) {
  try {
    const users = await LeetcodeUsers.find({});
    if (!users || users.length === 0) return;

    client.logger?.log(`[LeetCode Tracker] Starting solve check for ${users.length} users...`, "log");

    for (const user of users) {
      // Stagger queries by 3 seconds to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 3000));

      const submissions = await fetchRecentAcSubmissions(user.lcUsername, 15);
      if (!submissions || submissions.length === 0) continue;

      for (const sub of submissions) {
        const slug = sub.titleSlug;
        // Check if this problem is active in leetcode_posted_questions
        const postedQList = await LeetcodePostedQuestions.find({ slug });
        if (!postedQList || postedQList.length === 0) continue;

        for (const pq of postedQList) {
          const solvedAt = new Date(Number(sub.timestamp) * 1000);
          
          // Must be solved AFTER the question was posted
          const postedAtTime = pq.postedAt instanceof Date ? pq.postedAt.getTime() : Number(pq.postedAt);
          if (solvedAt.getTime() <= postedAtTime) continue;

          // Attempt to resolve channel and guild
          const channel = client.channels.cache.get(pq.channelId) || 
                          await client.channels.fetch(pq.channelId).catch(() => null);
          if (!channel || !channel.guild) continue;

          const guildId = channel.guild.id;

          // Check if user is a member of the guild
          const member = await channel.guild.members.fetch(user.discordId).catch(() => null);
          if (!member) continue;

          // Check if already rewarded
          const existingSolve = await LeetcodeSolves.findOne({
            guildId,
            discordId: user.discordId,
            slug
          });
          if (existingSolve) continue;

          // Determine points based on config
          const config = await LeetcodeServerConfig.findOne({ guildId });
          const pointsEasy = config?.pointsEasy !== undefined ? config.pointsEasy : 10;
          const pointsMedium = config?.pointsMedium !== undefined ? config.pointsMedium : 20;
          const pointsHard = config?.pointsHard !== undefined ? config.pointsHard : 30;

          let points = 0;
          const diff = (pq.difficulty || "Easy").toLowerCase();
          if (diff === "easy") points = pointsEasy;
          else if (diff === "medium") points = pointsMedium;
          else if (diff === "hard") points = pointsHard;

          // Save solve record
          try {
            await LeetcodeSolves.create({
              guildId,
              discordId: user.discordId,
              slug,
              title: pq.title,
              difficulty: pq.difficulty,
              pointsAwarded: points,
              solvedAt,
              recordedAt: new Date()
            });
          } catch (dbErr) {
            // Unique index might catch concurrent insert, ignore
            continue;
          }

          client.logger?.log(`[LeetCode Tracker] User ${user.discordId} solved ${slug} in guild ${guildId} (+${points} pts)`, "ready");

          // Dispatch shoutout
          let shoutoutChannel = channel;
          if (config?.shoutoutChannelId) {
            const configuredChan = channel.guild.channels.cache.get(config.shoutoutChannelId) ||
                                   await channel.guild.channels.fetch(config.shoutoutChannelId).catch(() => null);
            if (configuredChan) {
              shoutoutChannel = configuredChan;
            }
          }

          // Difficulty Badge
          let diffEmoji = "🟢 Easy";
          let diffColor = "#57F287"; // Green
          if (diff === "medium") {
            diffEmoji = "🟡 Medium";
            diffColor = "#FEE75C"; // Yellow
          } else if (diff === "hard") {
            diffEmoji = "🔴 Hard";
            diffColor = "#ED4245"; // Red
          }

          const shoutoutEmbed = new EmbedBuilder()
            .setTitle("🎉 LeetCode Solve Detected!")
            .setDescription(`**${member.user.tag}** linked LeetCode profile **[${user.lcUsername}](https://leetcode.com/${user.lcUsername})** just solved **[${pq.title}](https://leetcode.com/problems/${slug}/)**!`)
            .addFields(
              { name: "Difficulty", value: diffEmoji, inline: true },
              { name: "Points Awarded", value: `**+${points}** XP`, inline: true }
            )
            .setColor(diffColor)
            .setThumbnail("https://assets.leetcode.com/users/default_avatar.jpg")
            .setTimestamp(solvedAt);

          await shoutoutChannel.send(v2({ embeds: [shoutoutEmbed] })).catch((err) => {
            console.error(`[LeetCode Tracker] Failed to send shoutout in ${shoutoutChannel.id}:`, err.message);
          });
        }
      }
    }
  } catch (error) {
    console.error("[LeetCode Tracker] Error in checkSolves loop:", error.stack || error);
  }
}

/**
 * Starts the periodic solver checking loop on Cluster 0.
 */
function startLeetcodeInterval(client) {
  const currentCluster = Number(process.env.CLUSTER || 0);
  // Only run polling on Cluster 0
  if (currentCluster !== 0) {
    client.logger?.log("[LeetCode Tracker] Tracker skipped: not running on Cluster 0", "log");
    return;
  }

  client.logger?.log("[LeetCode Tracker] Initializing LeetCode solver tracking checker (10-minute interval)...", "ready");

  // Run on startup
  setTimeout(() => checkSolves(client), 30000);

  // Set interval to check every 10 minutes (600,000 ms)
  setInterval(() => {
    checkSolves(client).catch(err => {
      console.error("[LeetCode Tracker] Error in background checkSolves execution:", err);
    });
  }, 10 * 60 * 1000);
}

const verifyCooldowns = new Map();

/**
 * Check and apply a 10-second verify rate limit for a user.
 * Returns the number of seconds remaining, or 0 if allowed.
 */
function checkVerifyCooldown(userId) {
  const now = Date.now();
  const lastTime = verifyCooldowns.get(userId) || 0;
  const cooldown = 10000; // 10 seconds

  if (now - lastTime < cooldown) {
    return Math.ceil((cooldown - (now - lastTime)) / 1000);
  }

  verifyCooldowns.set(userId, now);
  return 0;
}

module.exports = {
  fetchLeetcodeUser,
  fetchRecentAcSubmissions,
  fetchQuestionDetails,
  checkSolves,
  startLeetcodeInterval,
  checkVerifyCooldown
};
