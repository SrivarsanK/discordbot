const fs = require("fs");
const path = require("path");

module.exports = (client) => {
  const automodPath = path.join(__dirname, "../events/AutoMod");

  if (!fs.existsSync(automodPath)) {
    client.logger.log("⚠️ AutoMod Events Directory Missing", "warn");
    return;
  }

  let totalEvents = 0;
  fs.readdirSync(automodPath).filter((file) => file.endsWith(".js")).forEach((file) => {
    const event = require(path.join(automodPath, file));
    if (!event?.name || typeof event.run !== "function") {
      client.logger.log(`Skipped invalid AutoMod event: ${file}`, "warn");
      return;
    }

    client.on(event.name, (...args) => event.run(client, ...args));
    totalEvents++;
  });

  client.logger.log(`AutoMod Events Loaded: ${totalEvents}`, "event");
};
