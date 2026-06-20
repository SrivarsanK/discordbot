/** @format */

const { ActivityType, Events } = require("discord.js");
const deploySlashCommands = require("../../utils/deploySlashCommands");
const { refreshApplicationOwners } = require("../../utils/owners");
const { startLeetcodeInterval } = require("../../utils/leetcode");

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

    // Start LeetCode solver tracking background service
    try {
      startLeetcodeInterval(client);
    } catch (err) {
      client.logger.log(`[LeetCode Tracker] Startup failed: ${err.message}`, "error");
    }

    if (client.config.slashCommands?.deployOnReady) {
      client.logger.log("Deploying slash commands to Discord...", "cmd");
      await deploySlashCommands(client);
    }

    const statuses = client.config.app?.statuses || [];
    if (!statuses.length) return;

    const intervalMs = client.config.app?.statusIntervalMs;
    setInterval(function () {
      const status = statuses[Math.floor(Math.random() * statuses.length)]
        .replace("{users}", client.numb(user));
      client.user.setActivity(status, { type: ActivityType.Listening });
    }, intervalMs);
  },
};
