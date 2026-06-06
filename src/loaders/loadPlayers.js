const fs = require("fs");
const path = require("path");

module.exports = (client) => {
  const playerEventsPath = path.join(__dirname, "../events/Players");
  let totalEvents = 0;

  fs.readdirSync(playerEventsPath).filter((file) => file.endsWith(".js")).forEach((file) => {
    let event;
    try {
      event = require(path.join(playerEventsPath, file));
    } catch (error) {
      client.logger.log(`Skipped player event with load error: ${file} (${error.message})`, "warn");
      return;
    }

    if (!event?.name || typeof event.run !== "function") {
      client.logger.log(`Skipped invalid player event: ${file}`, "warn");
      return;
    }

    client.manager.on(event.name, (...args) => event.run(client, ...args));
    totalEvents++;
  });

  client.logger.log(`Player Events Loaded: ${totalEvents}`, "event");
};
