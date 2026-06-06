const fs = require("fs");
const path = require("path");

module.exports = (client) => {
  const antiNukePath = path.join(__dirname, "../events/Antinuke");
  if (!fs.existsSync(antiNukePath)) {
    client.logger.log("⚠️ Anti-Nuke Events Directory Missing", "warn");
    return;
  }

  let totalEvents = 0;
  fs.readdirSync(antiNukePath).filter((file) => file.endsWith(".js")).forEach((file) => {
    const event = require(path.join(antiNukePath, file));
    if (!event?.name || typeof event.run !== "function") {
      client.logger.log(`Skipped invalid Anti-Nuke event: ${file}`, "warn");
      return;
    }

    client.on(event.name, (...args) => event.run(client, ...args));
    totalEvents++;
  });

  client.logger.log(`Anti-Nuke Events Loaded: ${totalEvents}`, "event");
};
