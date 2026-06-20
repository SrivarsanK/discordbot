/** @format */

const { EmbedBuilder, ApplicationCommandOptionType } = require("discord.js");
const { v2 } = require("../../utils/v2");
const { fetchRecentAcSubmissions } = require("../../utils/leetcode");
const LeetcodeUsers = require("../../schema/leetcodeUsers");
const LeetcodePostedQuestions = require("../../schema/leetcodePostedQuestions");
const LeetcodeSolves = require("../../schema/leetcodeSolves");
const LeetcodeServerConfig = require("../../schema/leetcodeServerConfig");
const Tesseract = require("tesseract.js");
const axios = require("axios");

const cooldowns = new Map();

function checkSubmitCooldown(userId) {
  const now = Date.now();
  const lastTime = cooldowns.get(userId) || 0;
  const cooldown = 30000; // 30 seconds
  if (now - lastTime < cooldown) {
    return Math.ceil((cooldown - (now - lastTime)) / 1000);
  }
  cooldowns.set(userId, now);
  return 0;
}

function levenshtein(a, b) {
  const tmp = [];
  let i, j;
  for (i = 0; i <= a.length; i++) {
    tmp.push([i]);
  }
  for (j = 1; j <= b.length; j++) {
    tmp[0].push(j);
  }
  for (i = 1; i <= a.length; i++) {
    for (j = 1; j <= b.length; j++) {
      tmp[i][j] = Math.min(
        tmp[i - 1][j] + 1,
        tmp[i][j - 1] + 1,
        tmp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
  }
  return tmp[a.length][b.length];
}

module.exports = {
  name: "submit",
  description: "Submit a daily challenge solve with a screenshot for verification",
  options: [
    {
      name: "screenshot",
      description: "Screenshot showing LeetCode Accepted message and code with the challenge comment",
      type: ApplicationCommandOptionType.Attachment,
      required: true
    }
  ],

  run: async (client, interaction) => {
    // 1. Check cooldown
    const cooldownLeft = checkSubmitCooldown(interaction.user.id);
    if (cooldownLeft > 0) {
      return interaction.reply(v2({
        embeds: [
          new EmbedBuilder()
            .setDescription(`⚠️ Cooldown: Please wait **${cooldownLeft}s** before submitting again.`)
            .setColor("#ED4245")
        ],
        ephemeral: true
      }));
    }

    await interaction.deferReply({ ephemeral: true });

    // 2. Check user registration
    const user = await LeetcodeUsers.findOne({ discordId: interaction.user.id });
    if (!user) {
      return interaction.editReply(v2({
        embeds: [
          new EmbedBuilder()
            .setDescription("❌ You must link your LeetCode account first. Use **/register <leetcode_username>** to start.")
            .setColor("#ED4245")
        ]
      }));
    }

    // 3. Retrieve screenshot
    const screenshot = interaction.options.getAttachment("screenshot");
    if (!screenshot.contentType?.startsWith("image/")) {
      return interaction.editReply(v2({
        embeds: [
          new EmbedBuilder()
            .setDescription("❌ The attachment must be an image.")
            .setColor("#ED4245")
        ]
      }));
    }

    // 4. Retrieve active question for channel
    const questions = await LeetcodePostedQuestions.find({ channelId: interaction.channelId });
    if (!questions || questions.length === 0) {
      return interaction.editReply(v2({
        embeds: [
          new EmbedBuilder()
            .setDescription("❌ No LeetCode challenges have been posted in this channel yet.")
            .setColor("#ED4245")
        ]
      }));
    }
    const activeQuestion = questions.sort((a, b) => b.postedAt - a.postedAt)[0];

    // 5. Check if already solved
    const alreadySolved = await LeetcodeSolves.findOne({
      guildId: interaction.guildId,
      discordId: interaction.user.id,
      slug: activeQuestion.slug
    });
    if (alreadySolved) {
      return interaction.editReply(v2({
        embeds: [
          new EmbedBuilder()
            .setDescription(`ℹ️ You have already been credited for solving **${activeQuestion.title}**.`)
            .setColor("#5865F2")
        ]
      }));
    }

    const targetNonce = activeQuestion.nonce;
    let nonce_ok = false;

    if (!targetNonce) {
      // Legacy questions posted before nonce column was added
      nonce_ok = true;
    } else {
      // Run OCR using Tesseract.js
      let text = "";
      try {
        const response = await axios.get(screenshot.url, { responseType: "arraybuffer" });
        const buffer = Buffer.from(response.data);
        const { data } = await Tesseract.recognize(buffer, "eng");
        text = data.text || "";
      } catch (ocrErr) {
        console.error("[LeetCode Submit] OCR processing error:", ocrErr);
        return interaction.editReply(v2({
          embeds: [
            new EmbedBuilder()
              .setDescription("❌ Error reading the screenshot image. Please ensure it is a valid format.")
              .setColor("#ED4245")
          ]
        }));
      }

      // Regex search for LC-XXXXXX nonce format
      const matches = text.toUpperCase().match(/LC-[A-Z0-9]{5,7}/g) || [];
      for (const m of matches) {
        if (levenshtein(m, targetNonce) <= 2) {
          nonce_ok = true;
          break;
        }
      }
    }

    // 6. Check profile recent accepted submissions
    const recent = await fetchRecentAcSubmissions(user.lcUsername, 15);
    const profile_ok = recent.some(s => {
      const submissionTimeMs = s.timestamp * 1000;
      return s.titleSlug === activeQuestion.slug && submissionTimeMs > activeQuestion.postedAt;
    });

    // 7. Verify gates
    if (nonce_ok && profile_ok) {
      // Award points and record solve
      const serverConfig = await LeetcodeServerConfig.findOne({ guildId: interaction.guildId }) || {};
      const points = activeQuestion.difficulty === "Easy" ? (serverConfig.pointsEasy ?? 10) :
                     activeQuestion.difficulty === "Medium" ? (serverConfig.pointsMedium ?? 20) :
                     (serverConfig.pointsHard ?? 30);

      await LeetcodeSolves.create({
        guildId: interaction.guildId,
        discordId: interaction.user.id,
        slug: activeQuestion.slug,
        title: activeQuestion.title,
        difficulty: activeQuestion.difficulty,
        pointsAwarded: points,
        solvedAt: new Date()
      });

      // Ephemeral reply to user
      const successEmbed = new EmbedBuilder()
        .setTitle("🎉 Solve Confirmed!")
        .setDescription(`Congratulations! You verified your solve for **${activeQuestion.title}** and earned **${points} points**!`)
        .setColor("#57F287");
      
      await interaction.editReply(v2({ embeds: [successEmbed] }));

      // Post shoutout in server if shoutout channel is set
      const shoutoutChannelId = serverConfig.shoutoutChannelId;
      if (shoutoutChannelId) {
        const shoutoutChannel = interaction.guild.channels.cache.get(shoutoutChannelId) || 
                                await interaction.guild.channels.fetch(shoutoutChannelId).catch(() => null);
        if (shoutoutChannel) {
          const shoutoutEmbed = new EmbedBuilder()
            .setTitle("🏆 Challenge Solved!")
            .setDescription(`**${interaction.user}** solved the daily challenge:\n**[${activeQuestion.title}](https://leetcode.com/problems/${activeQuestion.slug})** (${activeQuestion.difficulty})\n\nEarned: **${points} points**!`)
            .setColor("#FEE75C")
            .setImage(screenshot.url)
            .setTimestamp();
          
          await shoutoutChannel.send(v2({ embeds: [shoutoutEmbed] })).catch(err => {
            console.error(`[LeetCode Submit] Failed to send shoutout:`, err.message);
          });
        }
      }
    } else if (profile_ok && !nonce_ok) {
      return interaction.editReply(v2({
        embeds: [
          new EmbedBuilder()
            .setDescription("❌ Solve confirmed on your profile, but couldn't verify this screenshot is for the current round — please resubmit a screenshot with the challenge code visible.")
            .setColor("#ED4245")
        ]
      }));
    } else if (nonce_ok && !profile_ok) {
      return interaction.editReply(v2({
        embeds: [
          new EmbedBuilder()
            .setDescription("❌ Couldn't confirm this as Accepted on your LeetCode profile yet — try again in a few minutes.")
            .setColor("#ED4245")
        ]
      }));
    } else {
      return interaction.editReply(v2({
        embeds: [
          new EmbedBuilder()
            .setDescription("❌ Verification failed. Could not find the challenge code in your screenshot, and the solve is not yet visible on your LeetCode profile.")
            .setColor("#ED4245")
        ]
      }));
    }
  }
};
