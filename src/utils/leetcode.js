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
 * Fetch unified LeetCode user profile data including solved stats and recent submissions.
 */
async function fetchLeetcodeUserData(username, limit = 15) {
  const query = `
    query getLeetcodeUserData($username: String!, $limit: Int!) {
      matchedUser(username: $username) {
        username
        profile {
          aboutMe
          userAvatar
          reputation
        }
        submitStatsGlobal {
          acSubmissionNum {
            difficulty
            count
          }
        }
      }
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

    return response.data?.data || null;
  } catch (error) {
    console.error(`[LeetCode API] Error fetching user data for ${username}:`, error.message);
    return null;
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
 * Fetch the active LeetCode daily coding challenge.
 */
async function fetchLeetcodeDailyChallenge() {
  const query = `
    query getDailyChallenge {
      activeDailyCodingChallengeQuestion {
        date
        link
        question {
          title
          titleSlug
          difficulty
          topicTags {
            name
          }
        }
      }
    }
  `;

  try {
    const response = await axios.post(LEETCODE_GQL_URL, {
      query
    }, { headers: HEADERS });

    return response.data?.data?.activeDailyCodingChallengeQuestion || null;
  } catch (error) {
    console.error("[LeetCode API] Error fetching daily challenge:", error.message);
    return null;
  }
}

/**
 * Check and automatically post the active daily coding challenge to configured channels.
 */
/**
 * Interpolate custom variables into a template string.
 */
function interpolateVars(template, vars) {
  if (!template) return template;
  return template
    .replace(/\{title\}/gi, vars.title || "")
    .replace(/\{slug\}/gi, vars.slug || "")
    .replace(/\{difficulty\}/gi, vars.difficulty || "")
    .replace(/\{diffEmoji\}/gi, vars.diffEmoji || "")
    .replace(/\{tags\}/gi, vars.tags || "")
    .replace(/\{url\}/gi, vars.url || "")
    .replace(/\{date\}/gi, vars.date || "")
    .replace(/\{diffColor\}/gi, vars.diffColor || "")
    .replace(/\{description\}/gi, vars.description || "")
    .replace(/\{approach\}/gi, vars.approach || "")
    .replace(/\{advice\}/gi, vars.advice || "")
    .replace(/\{hint\}/gi, vars.hint || "")
    .replace(/\{footer\}/gi, vars.footer || "")
    .replace(/\{day\}/gi, vars.day || "")
    .replace(/\{qno\}/gi, vars.qno || "")
    .replace(/\{leetcodeqno\}/gi, vars.leetcodeQno || "");
}

/**
 * Build separator text based on config style.
 */
function buildSeparator(style) {
  if (style === "line") return "───────────────────────────";
  if (style === "blank") return "\u200b";
  return "";
}

/**
 * Build an auto-post embed from question data and server config.
 */
function buildAutoPostEmbed(questionData, config) {
  const { title, titleSlug, difficulty, tags } = questionData;

  let diffEmoji = "🟢 Easy";
  let diffColor = "#57F287";
  const diff = difficulty.toLowerCase();
  if (diff === "medium") { diffEmoji = "🟡 Medium"; diffColor = "#FEE75C"; }
  else if (diff === "hard") { diffEmoji = "🔴 Hard"; diffColor = "#ED4245"; }

  const url = `https://leetcode.com/problems/${titleSlug}/`;
  const date = new Date().toISOString().slice(0, 10);
  const tagsStr = tags.length > 0 ? tags.map(t => `\`${t}\``).join(", ") : "*None*";

  const vars = {
    title,
    slug: titleSlug,
    difficulty,
    diffEmoji,
    tags: tagsStr,
    url,
    date,
    diffColor,
    description: questionData.description || "",
    approach: questionData.approach || "",
    advice: questionData.advice || "",
    hint: questionData.hint ? `||${questionData.hint}||` : "",
    footer: questionData.customFooter || "",
    day: questionData.day || "",
    qno: questionData.leetcodeQno || "",
    leetcodeQno: questionData.leetcodeQno || ""
  };

  // Determine embed content (custom or defaults)
  let defaultTitle = `📅 New LeetCode Daily Challenge Posted!`;
  if (questionData.day) {
    defaultTitle = `📅 LeetCode Challenge - Day ${questionData.day}`;
  }
  const embedTitle = config.autoPostTitle
    ? interpolateVars(config.autoPostTitle, vars)
    : defaultTitle;

  let defaultDesc = `### **[${title}](${url})**`;
  if (questionData.description) {
    defaultDesc += `\n\n${questionData.description}`;
  }
  const embedDesc = config.autoPostDescription
    ? interpolateVars(config.autoPostDescription, vars)
    : defaultDesc;

  let defaultFooterText = "Link your account using !register to earn points upon solving!";
  if (questionData.customFooter) {
    defaultFooterText = questionData.customFooter;
  }
  const embedFooter = config.autoPostFooter
    ? interpolateVars(config.autoPostFooter, vars)
    : defaultFooterText;

  const embedColor = /^#[0-9a-fA-F]{6}$/.test(config.autoPostColor) ? config.autoPostColor : diffColor;
  const embedThumbnail = config.autoPostThumbnail || "https://assets.leetcode.com/users/default_avatar.jpg";
  const separatorStyle = config.autoPostSeparator || "line";

  const embed = new EmbedBuilder()
    .setTitle(embedTitle)
    .setDescription(embedDesc)
    .setColor(embedColor)
    .setFooter({ text: embedFooter })
    .setTimestamp();

  if (config.autoPostShowThumbnail) {
    embed.setThumbnail(embedThumbnail);
  }

  // Add fields with separator
  const sep = buildSeparator(separatorStyle);
  const fields = [];

  if (questionData.leetcodeQno) {
    fields.push({ name: "Question No.", value: String(questionData.leetcodeQno), inline: true });
  }
  if (questionData.day) {
    fields.push({ name: "Challenge Day", value: `Day ${questionData.day}`, inline: true });
  }
  fields.push(
    { name: "Difficulty", value: diffEmoji, inline: true },
    { name: "Tags", value: tagsStr, inline: true }
  );

  if (questionData.approach) {
    fields.push({ name: "Approach", value: questionData.approach, inline: false });
  }
  if (questionData.advice) {
    fields.push({ name: "Advice", value: questionData.advice, inline: false });
  }
  if (questionData.hint) {
    fields.push({ name: "Hint", value: `||${questionData.hint}||`, inline: false });
  }

  // Count inline fields to put separator in the right place
  let inlineCount = 0;
  let splitIndex = 0;
  for (let i = 0; i < fields.length; i++) {
    if (fields[i].inline) {
      inlineCount++;
      splitIndex = i + 1;
    } else {
      break;
    }
  }

  if (sep && separatorStyle !== "none") {
    // Insert separator after the inline fields
    const inlineFields = fields.slice(0, splitIndex);
    const customFields = fields.slice(splitIndex);

    embed.addFields(...inlineFields);
    embed.addFields({ name: "\u200b", value: sep, inline: false });
    if (customFields.length > 0) {
      embed.addFields(...customFields);
    }
  } else {
    embed.addFields(...fields);
  }

  return embed;
}

async function checkDailyChallengePost(client) {
  try {
    const dailyData = await fetchLeetcodeDailyChallenge();
    if (!dailyData || !dailyData.question) return;

    const { title, titleSlug, difficulty, topicTags } = dailyData.question;
    const tags = (topicTags || []).map(t => t.name);

    // Fetch all server configurations where auto posting is enabled
    const configs = await LeetcodeServerConfig.find({ autoPostEnabled: true });
    if (!configs || configs.length === 0) return;

    for (const config of configs) {
      const { guildId, autoPostChannelId } = config;
      if (!autoPostChannelId) continue;

      // Resolve guild and channel
      const guild = client.guilds.cache.get(guildId) || await client.guilds.fetch(guildId).catch(() => null);
      if (!guild) continue;
      const channel = guild.channels.cache.get(autoPostChannelId) || 
                      await guild.channels.fetch(autoPostChannelId).catch(() => null);
      if (!channel) continue;

      // ── Post Daily Challenge ──
      const alreadyPosted = await LeetcodePostedQuestions.findOne({
        channelId: autoPostChannelId,
        slug: titleSlug
      });

      if (!alreadyPosted) {
        const announceEmbed = buildAutoPostEmbed({ title, titleSlug, difficulty, tags }, config);

        await channel.send(v2({ embeds: [announceEmbed] })).then(async () => {
          await savePostedQuestion(autoPostChannelId, titleSlug, title, difficulty, tags);
          client.logger?.log(`[LeetCode AutoPoster] Posted daily challenge "${title}" to channel ${autoPostChannelId} in guild ${guildId}`, "ready");
        }).catch((err) => {
          console.error(`[LeetCode AutoPoster] Failed to send auto-post in ${autoPostChannelId}:`, err.message);
        });
      }

      // ── CSV Rotation Posting ──
      const csvData = Array.isArray(config.autoPostCsvData) ? config.autoPostCsvData : [];
      if (csvData.length > 0) {
        const csvSlugs = csvData.map(r => r.slug).filter(Boolean);
        if (csvSlugs.length > 0) {
          const now = new Date();
          const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());

          // Check if any CSV question has already been posted today
          const postedToday = await LeetcodePostedQuestions.find({
            channelId: autoPostChannelId,
            slug: { $in: csvSlugs },
            postedAt: { $gte: midnight }
          });

          if (postedToday.length === 0) {
            const targetDayStr = String(config.autoPostCsvDay || 1).trim();
            const row = csvData.find(r => r && String(r.day || "").trim() === targetDayStr);
            if (row && row.slug) {
              const csvSlug = row.slug;

              // Check time slot
              let timePassed = true;
              if (row.time) {
                const [shour, smin] = row.time.split(":").map(Number);
                const currentHour = now.getHours();
                const currentMin = now.getMinutes();
                if (currentHour < shour || (currentHour === shour && currentMin < smin)) {
                  timePassed = false;
                }
              }

              if (timePassed) {
                // Fetch question details from LeetCode API
                const qDetails = await fetchQuestionDetails(csvSlug);
                if (qDetails) {
                  const csvTags = (qDetails.topicTags || []).map(t => t.name);
                  const csvEmbed = buildAutoPostEmbed({
                    title: qDetails.title,
                    titleSlug: csvSlug,
                    difficulty: qDetails.difficulty,
                    tags: csvTags,
                    description: row.description,
                    approach: row.approach,
                    advice: row.advice,
                    hint: row.hint,
                    customFooter: row.footer,
                    day: row.day,
                    leetcodeQno: row.leetcodeQno
                  }, config);

                  await channel.send(v2({ embeds: [csvEmbed] })).then(async () => {
                    await savePostedQuestion(autoPostChannelId, csvSlug, qDetails.title, qDetails.difficulty, csvTags);
                    client.logger?.log(`[LeetCode CSV] Posted CSV question "${qDetails.title}" to channel ${autoPostChannelId} in guild ${guildId}`, "ready");
                    
                    // Increment the day counter in the database
                    const nextDay = (config.autoPostCsvDay || 1) + 1;
                    await LeetcodeServerConfig.findOneAndUpdate(
                      { guildId },
                      { autoPostCsvDay: nextDay }
                    ).catch((err) => {
                      console.error(`[LeetCode CSV] Failed to increment day counter for guild ${guildId}:`, err.message);
                    });
                  }).catch((err) => {
                    console.error(`[LeetCode CSV] Failed to send CSV post for ${csvSlug}:`, err.message);
                  });
                } else {
                  console.error(`[LeetCode CSV] Could not fetch details for slug "${csvSlug}", skipping.`);
                }
              }
            }
          }
        }
      }
    }
  } catch (error) {
    console.error("[LeetCode AutoPoster] Error in checkDailyChallengePost execution:", error.stack || error);
  }
}

/**
 * Save a posted question record (check-and-create for composite key).
 */
async function savePostedQuestion(channelId, slug, title, difficulty, tags) {
  const existing = await LeetcodePostedQuestions.findOne({ channelId, slug });
  if (existing) {
    await LeetcodePostedQuestions.updateOne(
      { channelId, slug },
      { title, difficulty, tags, postedAt: new Date() }
    ).catch(dbErr => {
      console.error(`[LeetCode AutoPoster] Error saving posted question:`, dbErr.message);
    });
  } else {
    await LeetcodePostedQuestions.create({
      channelId, slug, title, difficulty, tags, postedAt: new Date()
    }).catch(dbErr => {
      console.error(`[LeetCode AutoPoster] Error saving posted question:`, dbErr.message);
    });
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

      const data = await fetchLeetcodeUserData(user.lcUsername, 15);
      if (!data) continue;

      // Update overall solved stats cache in database
      const stats = data.matchedUser?.submitStatsGlobal?.acSubmissionNum || [];
      const solvedEasy = stats.find(s => s.difficulty === "Easy")?.count || 0;
      const solvedMedium = stats.find(s => s.difficulty === "Medium")?.count || 0;
      const solvedHard = stats.find(s => s.difficulty === "Hard")?.count || 0;

      await LeetcodeUsers.updateOne(
        { discordId: user.discordId },
        { solvedEasy, solvedMedium, solvedHard, lastUpdated: new Date() }
      ).catch(err => {
        console.error(`[LeetCode Tracker] Error updating solved stats for ${user.discordId}:`, err.message);
      });

      const submissions = data.recentAcSubmissionList || [];
      if (submissions.length === 0) continue;

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

    // Run the daily challenge auto-poster check
    await checkDailyChallengePost(client).catch(err => {
      console.error("[LeetCode AutoPoster] Error in background daily challenge post execution:", err);
    });
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
  fetchLeetcodeUserData,
  fetchQuestionDetails,
  checkSolves,
  startLeetcodeInterval,
  checkVerifyCooldown,
  fetchLeetcodeDailyChallenge,
  checkDailyChallengePost
};
