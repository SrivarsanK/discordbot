const { v2 } = require("../../utils/v2");

module.exports = {
  name: "playerError",
  run: async (client, player, type, error) => {
    client.logger.log(`Player error: ${error?.message || error}`, "error");

    const channel = client.channels.cache.get(player.textId);
    if (channel) {
      channel.send(v2({
        content: `${client.emoji.cross} | An error occurred during playback: ${error?.message || "Unknown error"}. Skipping to the next track...`
      })).catch(() => null);
    }
  },
};
