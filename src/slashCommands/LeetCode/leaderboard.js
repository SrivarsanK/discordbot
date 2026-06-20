/** @format */

const { 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  ComponentType,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  MessageFlags
} = require("discord.js");
const { v2 } = require("../../utils/v2");
const LeetcodeUsers = require("../../schema/leetcodeUsers");
const LeetcodeSolves = require("../../schema/leetcodeSolves");
const LeetcodeServerConfig = require("../../schema/leetcodeServerConfig");

module.exports = {
  name: "leaderboard",
  description: "View the server LeetCode leaderboard",
  options: [],

  run: async (client, interaction) => {
    await interaction.deferReply();
    const guildId = interaction.guildId;
    const guild = interaction.guild;

    // Fetch server configuration for points system weights
    const config = await LeetcodeServerConfig.findOne({ guildId });
    const pointsEasy = config?.pointsEasy !== undefined ? config.pointsEasy : 10;
    const pointsMedium = config?.pointsMedium !== undefined ? config.pointsMedium : 20;
    const pointsHard = config?.pointsHard !== undefined ? config.pointsHard : 30;

    // Fetch all linked users and solves to resolve member cache efficiently
    const allLcUsers = await LeetcodeUsers.find({});
    const solves = await LeetcodeSolves.find({ guildId });
    const relevantUserIds = [...new Set([
      ...allLcUsers.map(u => u.discordId),
      ...solves.map(s => s.discordId)
    ])];

    // Query server members list for verification and filter
    const memberCache = relevantUserIds.length > 0 
      ? await guild.members.fetch({ user: relevantUserIds }).catch(() => null) 
      : null;

    // Helper function to build leaderboard data list
    const getLeaderboardList = (type) => {
      if (type === "questions") {
        const localUsers = allLcUsers.filter(u => memberCache ? memberCache.has(u.discordId) : false);
        return localUsers.map(u => {
          const score = (u.solvedEasy * pointsEasy) + (u.solvedMedium * pointsMedium) + (u.solvedHard * pointsHard);
          return {
            discordId: u.discordId,
            lcUsername: u.lcUsername,
            solvedEasy: u.solvedEasy,
            solvedMedium: u.solvedMedium,
            solvedHard: u.solvedHard,
            points: score
          };
        }).sort((a, b) => b.points - a.points);
      }

      // Overall, weekly, monthly
      let filteredSolves = solves;
      const now = new Date();

      if (type === "weekly") {
        const startOfWeek = new Date(now);
        const day = startOfWeek.getDay();
        const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // Monday
        startOfWeek.setDate(diff);
        startOfWeek.setHours(0, 0, 0, 0);

        filteredSolves = solves.filter(s => {
          const solvedAt = s.solvedAt instanceof Date ? s.solvedAt.getTime() : Number(s.solvedAt);
          return solvedAt >= startOfWeek.getTime();
        });
      } else if (type === "monthly") {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        filteredSolves = solves.filter(s => {
          const solvedAt = s.solvedAt instanceof Date ? s.solvedAt.getTime() : Number(s.solvedAt);
          return solvedAt >= startOfMonth.getTime();
        });
      }

      const pointsMap = {};
      filteredSolves.forEach(s => {
        pointsMap[s.discordId] = (pointsMap[s.discordId] || 0) + s.pointsAwarded;
      });

      return Object.entries(pointsMap)
        .map(([discordId, points]) => ({ discordId, points }))
        .filter(item => memberCache ? memberCache.has(item.discordId) : true)
        .sort((a, b) => b.points - a.points);
    };

    // State parameters
    const itemsPerPage = 10;
    let currentSelectedType = "overall";
    let currentPage = 1;

    let currentList = getLeaderboardList(currentSelectedType);
    let totalPages = Math.max(1, Math.ceil(currentList.length / itemsPerPage));

    // Generate Embed
    const generateEmbed = (list, type, page) => {
      const pageTotal = Math.max(1, Math.ceil(list.length / itemsPerPage));
      const startIdx = (page - 1) * itemsPerPage;
      const endIdx = startIdx + itemsPerPage;
      const pageItems = list.slice(startIdx, endIdx);

      let description = "";
      if (list.length === 0) {
        description = "ℹ️ No participants found for this leaderboard.";
      } else {
        description = pageItems.map((item, idx) => {
          const rank = startIdx + idx + 1;
          let rankEmoji = `**#${rank}**`;
          if (rank === 1) rankEmoji = "🏆";
          else if (rank === 2) rankEmoji = "🥈";
          else if (rank === 3) rankEmoji = "🥉";

          if (type === "questions") {
            return `${rankEmoji} <@${item.discordId}> - **${item.points}** XP (LC: \`${item.lcUsername}\`)\n   └ Solved: 🟢 **${item.solvedEasy}** | 🟡 **${item.solvedMedium}** | 🔴 **${item.solvedHard}**`;
          } else {
            return `${rankEmoji} <@${item.discordId}> - **${item.points}** XP`;
          }
        }).join("\n");
      }

      let resetTimer = "";
      const now = new Date();
      if (type === "weekly") {
        const day = now.getDay();
        const daysUntilNextMonday = (8 - day) % 7 || 7;
        const nextMonday = new Date(now);
        nextMonday.setDate(now.getDate() + daysUntilNextMonday);
        nextMonday.setHours(0, 0, 0, 0);
        const resetTimeSeconds = Math.floor(nextMonday.getTime() / 1000);
        resetTimer = `\n\n⏱️ **Resets:** <t:${resetTimeSeconds}:R>`;
      } else if (type === "monthly") {
        const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0);
        const resetTimeSeconds = Math.floor(nextMonth.getTime() / 1000);
        resetTimer = `\n\n⏱️ **Resets:** <t:${resetTimeSeconds}:R>`;
      }

      const titles = {
        overall: "Overall Points Leaderboard",
        weekly: "Weekly Points Leaderboard",
        monthly: "Monthly Points Leaderboard",
        questions: "Overall LeetCode Questions Leaderboard"
      };

      return new EmbedBuilder()
        .setTitle(`🏆 ${titles[type]}`)
        .setDescription(description + resetTimer)
        .setColor(client.embedColor || "#5865F2")
        .setFooter({ text: `Page ${page} of ${pageTotal} • Total participants: ${list.length}` })
        .setTimestamp();
    };

    // Generate Layout Components
    const generateComponents = (type, page, tPages) => {
      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId("leaderboard_select")
        .setPlaceholder("Select Leaderboard Type")
        .addOptions(
          new StringSelectMenuOptionBuilder()
            .setLabel("Overall Points")
            .setDescription("Rankings by overall points earned from server challenges")
            .setValue("overall")
            .setEmoji("🏆")
            .setDefault(type === "overall"),
          new StringSelectMenuOptionBuilder()
            .setLabel("Weekly Points")
            .setDescription("Rankings by points earned this week")
            .setValue("weekly")
            .setEmoji("📅")
            .setDefault(type === "weekly"),
          new StringSelectMenuOptionBuilder()
            .setLabel("Monthly Points")
            .setDescription("Rankings by points earned this month")
            .setValue("monthly")
            .setEmoji("📆")
            .setDefault(type === "monthly"),
          new StringSelectMenuOptionBuilder()
            .setLabel("Questions Solved")
            .setDescription("Rankings by overall LeetCode solved counts")
            .setValue("questions")
            .setEmoji("📝")
            .setDefault(type === "questions")
        );

      const menuRow = new ActionRowBuilder().addComponents(selectMenu);
      const components = [menuRow];

      if (tPages > 1) {
        const buttonRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("prev")
            .setLabel("◀️")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page === 1),
          new ButtonBuilder()
            .setCustomId("next")
            .setLabel("▶️")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page === tPages)
        );
        components.push(buttonRow);
      }

      return components;
    };

    const initialEmbed = generateEmbed(currentList, currentSelectedType, currentPage);
    const initialComponents = generateComponents(currentSelectedType, currentPage, totalPages);

    const response = await interaction.editReply(v2({
      embeds: [initialEmbed],
      components: initialComponents
    }));

    // Start component interaction collector (select menu + buttons)
    const collector = response.createMessageComponentCollector({
      time: 120000 // 2 minutes active time
    });

    collector.on("collect", async (i) => {
      if (i.user.id !== interaction.user.id) {
        return i.reply(v2({
          content: "❌ Only the person who ran the command can interact with it.",
          flags: MessageFlags.Ephemeral
        }));
      }

      if (i.isStringSelectMenu() && i.customId === "leaderboard_select") {
        currentSelectedType = i.values[0];
        currentPage = 1;
        currentList = getLeaderboardList(currentSelectedType);
        totalPages = Math.max(1, Math.ceil(currentList.length / itemsPerPage));
      } else if (i.isButton()) {
        if (i.customId === "prev" && currentPage > 1) {
          currentPage--;
        } else if (i.customId === "next" && currentPage < totalPages) {
          currentPage++;
        }
      }

      const nextEmbed = generateEmbed(currentList, currentSelectedType, currentPage);
      const nextComponents = generateComponents(currentSelectedType, currentPage, totalPages);

      await i.update(v2({
        embeds: [nextEmbed],
        components: nextComponents
      })).catch(() => {});
    });

    collector.on("end", async () => {
      // Disable components on timeout
      const disabledComponents = generateComponents(currentSelectedType, currentPage, totalPages).map(row => {
        const disabledRow = new ActionRowBuilder();
        row.components.forEach(comp => {
          // Deep clone or rebuild to set disabled
          if (comp.data.type === ComponentType.StringSelect) {
            const newMenu = StringSelectMenuBuilder.from(comp).setDisabled(true);
            disabledRow.addComponents(newMenu);
          } else if (comp.data.type === ComponentType.Button) {
            const newBtn = ButtonBuilder.from(comp).setDisabled(true);
            disabledRow.addComponents(newBtn);
          }
        });
        return disabledRow;
      });

      await interaction.editReply(v2({
        components: disabledComponents
      })).catch(() => {});
    });
  },
};
