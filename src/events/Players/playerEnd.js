const { EmbedBuilder } = require("discord.js");

module.exports = {
  name: "playerEnd",
  run: async (client, player) => {
    player.data
      .get("message")
      ?.delete()
      .catch(() => null);
    const guild = client.guilds.cache.get(player.guildId);
    if (!guild) return;
  },
};
