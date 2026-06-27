const { v2 } = require("../../utils/v2");

module.exports = {
  name: "playerException",
  run: async (client, player, reason) => {
    const errorMsg = reason?.exception?.message || reason?.message || (typeof reason === 'string' ? reason : JSON.stringify(reason));
    client.logger.log(`Player exception: ${errorMsg}`, "error");

    const channel = client.channels.cache.get(player.textId);
    if (channel) {
      channel.send(v2({
        content: `${client.emoji.cross} | A playback exception occurred: \`${errorMsg}\`. Skipping to the next track...`
      })).catch(() => null);
    }
  },
};
