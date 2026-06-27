const { v2 } = require("../../utils/v2");

module.exports = {
  name: "playerException",
  run: async (client, player, reason) => {
    client.logger.log(`Player exception: ${reason?.message || reason}`, "error");

    const channel = client.channels.cache.get(player.textId);
    if (channel) {
      channel.send(v2({
        content: `${client.emoji.cross} | A playback exception occurred: ${reason?.message || reason || "Unknown error"}. Skipping to the next track...`
      })).catch(() => null);
    }
  },
};
