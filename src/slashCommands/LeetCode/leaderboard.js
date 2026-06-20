/** @format */

const { 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  ComponentType,
  ApplicationCommandOptionType,
  MessageFlags
} = require("discord.js");
const { v2 } = require("../../utils/v2");
const LeetcodePostedQuestions = require("../../schema/leetcodePostedQuestions");
const LeetcodeSolves = require("../../schema/leetcodeSolves");

module.exports = {
  name: "leaderboard",
  description: "View the server LeetCode leaderboard",
  options: [
    {
      name: "timeframe",
      description: "Filter by timeframe",
      type: ApplicationCommandOptionType.String,
      required: false,
      choices: [
        { name: "overall", value: "overall" },
        { name: "weekly", value: "weekly" },
        { name: "monthly", value: "monthly" }
      ]
    },
    {
      name: "category",
      description: "Filter by category / tag (e.g. Graph)",
      type: ApplicationCommandOptionType.String,
      required: false
    }
  ],

  run: async (client, interaction) => {
    await interaction.deferReply();
    const guildId = interaction.guildId;

    const timeframe = interaction.options.getString("timeframe") || "overall";
    const category = interaction.options.getString("category");

    // Fetch all solves for this guild
    let solves = await LeetcodeSolves.find({ guildId });

    // Apply timeframe filter
    const now = new Date();
    if (timeframe === "weekly") {
      const startOfWeek = new Date(now);
      const day = startOfWeek.getDay();
      const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // Monday
      startOfWeek.setDate(diff);
      startOfWeek.setHours(0, 0, 0, 0);

      solves = solves.filter(s => {
        const solvedAt = s.solvedAt instanceof Date ? s.solvedAt.getTime() : Number(s.solvedAt);
        return solvedAt >= startOfWeek.getTime();
      });
    } else if (timeframe === "monthly") {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      solves = solves.filter(s => {
        const solvedAt = s.solvedAt instanceof Date ? s.solvedAt.getTime() : Number(s.solvedAt);
        return solvedAt >= startOfMonth.getTime();
      });
    }

    // Apply category filter
    if (category) {
      const questions = await LeetcodePostedQuestions.find({});
      const categorySlugs = questions
        .filter(q => (q.tags || []).some(t => t.toLowerCase() === category.toLowerCase()))
        .map(q => q.slug);

      solves = solves.filter(s => categorySlugs.includes(s.slug));
    }

    // Aggregate points per user
    const pointsMap = {};
    solves.forEach(s => {
      pointsMap[s.discordId] = (pointsMap[s.discordId] || 0) + s.pointsAwarded;
    });

    const leaderboard = Object.entries(pointsMap)
      .map(([discordId, points]) => ({ discordId, points }))
      .sort((a, b) => b.points - a.points);

    if (leaderboard.length === 0) {
      const filterDesc = category ? ` in the **${category}** category` : "";
      return interaction.editReply(v2({
        embeds: [
          new EmbedBuilder()
            .setDescription(`ℹ️ No points recorded on the **${timeframe}** leaderboard${filterDesc} yet.`)
            .setColor("#5865F2")
        ]
      }));
    }

    // Pagination setup
    const itemsPerPage = 10;
    const totalPages = Math.ceil(leaderboard.length / itemsPerPage);
    let currentPage = 1;

    // Helper to generate the leaderboard page embed
    const generateEmbed = (page) => {
      const startIdx = (page - 1) * itemsPerPage;
      const endIdx = startIdx + itemsPerPage;
      const pageItems = leaderboard.slice(startIdx, endIdx);

      const listLines = pageItems.map((item, idx) => {
        const rank = startIdx + idx + 1;
        let rankEmoji = `**#${rank}**`;
        if (rank === 1) rankEmoji = "🏆";
        else if (rank === 2) rankEmoji = "🥈";
        else if (rank === 3) rankEmoji = "🥉";

        return `${rankEmoji} <@${item.discordId}> - **${item.points}** XP`;
      }).join("\n");

      const titleCategory = category ? ` - ${category}` : "";
      const timeframeTitle = timeframe.charAt(0).toUpperCase() + timeframe.slice(1);

      return new EmbedBuilder()
        .setTitle(`🏆 LeetCode Leaderboard (${timeframeTitle}${titleCategory})`)
        .setDescription(listLines)
        .setColor(client.embedColor || "#5865F2")
        .setFooter({ text: `Page ${page} of ${totalPages} • Total participants: ${leaderboard.length}` })
        .setTimestamp();
    };

    // Helper to generate pagination buttons
    const generateButtons = (page) => {
      return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("prev")
          .setLabel("◀️")
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(page === 1),
        new ButtonBuilder()
          .setCustomId("next")
          .setLabel("▶️")
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(page === totalPages)
      );
    };

    const initialEmbed = generateEmbed(currentPage);
    const initialButtons = generateButtons(currentPage);

    const response = await interaction.editReply(v2({
      embeds: [initialEmbed],
      components: totalPages > 1 ? [initialButtons] : []
    }));

    if (totalPages <= 1) return;

    // Start button collector
    const collector = response.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 120000 // 2 minutes active time
    });

    collector.on("collect", async (i) => {
      if (i.user.id !== interaction.user.id) {
        return i.reply(v2({
          content: "❌ Only the person who ran the command can change pages.",
          flags: MessageFlags.Ephemeral
        }));
      }

      if (i.customId === "prev" && currentPage > 1) {
        currentPage--;
      } else if (i.customId === "next" && currentPage < totalPages) {
        currentPage++;
      }

      await i.update(v2({
        embeds: [generateEmbed(currentPage)],
        components: [generateButtons(currentPage)]
      })).catch(() => {});
    });

    collector.on("end", async () => {
      // Remove buttons after collector timeout
      const disabledRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("prev")
          .setLabel("◀️")
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(true),
        new ButtonBuilder()
          .setCustomId("next")
          .setLabel("▶️")
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(true)
      );

      await interaction.editReply(v2({
        components: [disabledRow]
      })).catch(() => {});
    });
  },
};
