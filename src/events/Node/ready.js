/** @format */

const { restore247 } = require("../../utils/restore247");

module.exports = {
  name: "ready",
  run: async (client, name) => {
    client.logger.log(`Lavalink "${name}" connected.`, "ready");

    if (client.isReady()) {
      await restore247(client);
    } else {
      client.logger.log(
        `Lavalink "${name}" connected, but Discord client is not ready. Postponing 24/7 restore.`,
        "log",
      );
    }
  },
};
