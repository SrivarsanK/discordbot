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

    let index = 0;
    client.updatePresence = () => {
      try {
        const serverCount = client.guilds.cache.size || 0;
        const totalUsers = client.guilds.cache.reduce((a, g) => a + g.memberCount, 0);

        let statusText = statuses[index];
        if (statusText.includes("{servers}")) {
          if (statusText.includes("{servers} servers")) {
            statusText = statusText.replace("{servers}", serverCount);
          } else {
            statusText = statusText.replace("{servers}", `${serverCount} servers!`);
          }
        }
        statusText = statusText.replace("{users}", client.numb(totalUsers));

        client.user.setActivity(statusText, { type: ActivityType.Listening });
      } catch (err) {
        client.logger.log(`[Presence Update] Failed to update presence: ${err.message}`, "error");
      }
    };

    // Set initial status immediately on ready
    client.updatePresence();

    // Rotate status messages every 15 seconds (respects Discord's 5 updates per minute limit)
    setInterval(() => {
      index = (index + 1) % statuses.length;
      client.updatePresence();
    }, 15000);

    // Trigger 24/7 voice restore if at least one Lavalink node is already connected
    const { restore247 } = require("../../utils/restore247");
    const hasReadyNode = [...client.manager.shoukaku.nodes.values()].some(node => node.state === 1);
    if (hasReadyNode) {
      await restore247(client);
    }
  },
};
