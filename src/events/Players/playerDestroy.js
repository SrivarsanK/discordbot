const {
  Webhooks: { player_delete },
} = require("../../config.js");
const { sendWebhook } = require("../../utils/webhook");

module.exports = {
  name: "playerDestroy",
  run: async (client, player) => {
    const guild = client.guilds.cache.get(player.guildId);
    if (!guild) return;
    const name = guild.name;
    const server = client.guilds.cache.get(player.guildId);
      const voice = player.voiceId;
    client.rest
      .put(`/channels/${voice}/voice-status`, { body: { status: `` } })
      .catch(() => null);
    const embed2 = new client.embed()
      
      .setAuthor({
        name: `Player Destroyed`,
        iconURL: client.user.displayAvatarURL(),
      })
      .setDescription(`Id: **${server.id}**\nName: **${name? name : 'idk'}**`);
    sendWebhook(client, player_delete, { embeds: [embed2] }, "player destroy");
    client.logger.log(`Player Destroy in ${name? name : 'idk'} [ ${player.guildId} ]`, "log");
    if (player.data.get("message") && player.data.get("message").deletable)
      player.data
        .get("message")
        .delete()
        .catch(() => null);
    if (player.data.get("autoplay"))
      try {
        player.data.delete("autoplay");
      } catch (err) {
        client.logger.log(err.stack ? err.stack : err, "log");
      }
  },
};
