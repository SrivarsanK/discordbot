const fs = require("fs");
const path = require("path");

module.exports = (client) => {
  const nodeEventsPath = path.join(__dirname, "../events/Node");
  let totalEvents = 0;
  fs.readdirSync(nodeEventsPath).filter((file) => file.endsWith(".js")).forEach((file) => {
    const event = require(path.join(nodeEventsPath, file));
    if (!event?.name || typeof event.run !== "function") {
      client.logger.log(`Skipped invalid Lavalink node event: ${file}`, "warn");
      return;
    }

    client.manager.shoukaku.on(event.name, (...args) =>
      event.run(client, ...args),
    );
    totalEvents++;
  });
  client.logger.log(`Lavalink Node Events Loaded: ${totalEvents}`, "event");
};
