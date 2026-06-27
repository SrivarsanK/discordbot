const { v2 } = require("../../utils/v2");

module.exports = {
  name: "playerError",
  run: async (client, player, type, error) => {
    const errorMsg = error?.message || error?.exception?.message || (typeof error === 'string' ? error : JSON.stringify(error));
    client.logger.log(`Player error: ${errorMsg}`, "error");

    const channel = client.channels.cache.get(player.textId);
    if (channel) {
      channel.send(v2({
        content: `${client.emoji.cross} | An error occurred during playback: \`${errorMsg}\`. Skipping to the next track...`
      })).catch(() => null);
    }
  },
};
