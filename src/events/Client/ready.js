/** @format */

const { ActivityType, Events } = require("discord.js");
const deploySlashCommands = require("../../utils/deploySlashCommands");
const { refreshApplicationOwners } = require("../../utils/owners");
const { startLeetcodeInterval } = require("../../utils/leetcode");
const { startServerStatsInterval } = require("../../utils/serverStatsService");

module.exports = {
  name: Events.ClientReady,
  once: true,
  run: async (client) => {
    const user = client.guilds.cache.reduce((a, g) => a + g.memberCount, 0);
    client.logger.log(`${client.user.username} online!`, "ready");
    client.logger.log(
      `Ready on ${client.guilds.cache.size} servers, for a total of ${user} users`,
      "ready",
    );
    const owners = await refreshApplicationOwners(client);
    client.logger.log(`[Owners] Loaded ${owners.length} owner access ID(s).`, "ready");

    // Attempt to set application description (About Me bio) programmatically
    try {
      await client.application.edit({
        description: "Premium Discord bot featuring high-fidelity music, active anti-nuke security, and automated LeetCode OCR solve verification.\n\nwebsite: bot.developerstudents.club\ncontact: @theiqsweat"
      });
      client.logger.log("Successfully updated Discord application description/bio.", "ready");
    } catch (err) {
      client.logger.log(`Could not update application bio programmatically: ${err.message}`, "warn");
    }

    // Start LeetCode solver tracking background service
    try {
      startLeetcodeInterval(client);
    } catch (err) {
      client.logger.log(`[LeetCode Tracker] Startup failed: ${err.message}`, "error");
    }

    // Start Live Server Stats tracking service
    try {
      startServerStatsInterval(client);
    } catch (err) {
      client.logger.log(`[Server Stats Tracker] Startup failed: ${err.message}`, "error");
    }


    if (client.config.slashCommands?.deployOnReady) {
      client.logger.log("Deploying slash commands to Discord...", "cmd");
      await deploySlashCommands(client);
    }

    const statuses = [
      "/help | bot.developerstudents.club",
      "{servers} servers!",
      "/help",
      "bot.developerstudents.club",
      "by K Srivarsan",
      "theiqsweat | Discord"
    ];

    let serverCount = client.guilds.cache.size || 0;
    let totalUsers = client.guilds.cache.reduce((a, g) => a + g.memberCount, 0);

    const updateCounts = async () => {
      try {
        if (client.cluster) {
          const guildSizes = await client.cluster.fetchClientValues("guilds.cache.size");
          serverCount = guildSizes.reduce((prev, val) => prev + val, 0);
        } else {
          serverCount = client.guilds.cache.size || 0;
        }
        totalUsers = client.guilds.cache.reduce((a, g) => a + g.memberCount, 0);
      } catch (err) {
        serverCount = client.guilds.cache.size || 0;
        totalUsers = client.guilds.cache.reduce((a, g) => a + g.memberCount, 0);
      }
    };

    let index = 0;
    const setStatus = () => {
      const statusText = statuses[index]
        .replace("{servers}", serverCount)
        .replace("{users}", client.numb(totalUsers));

      client.user.setActivity(statusText, { type: ActivityType.Listening });
      index = (index + 1) % statuses.length;
    };

    // Update counts and set the status immediately
    updateCounts().then(() => {
      setStatus();
    }).catch(() => {
      setStatus();
    });

    // Update cluster-wide server counts in the background every 30 seconds
    setInterval(updateCounts, 30000);

    // Rotate status messages every 5 seconds
    setInterval(setStatus, 5000);
  },
};
