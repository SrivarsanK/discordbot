/** @format */

const db = require("../../schema/247");

module.exports = {
  name: "ready",
  run: async (client, name) => {
    client.logger.log(`Lavalink "${name}" connected.`, "ready");
    client.logger.log("Auto Reconnect Collecting player 24/7 data", "log");

    const maindata = await db.find();
    client.logger.log(
      `Auto Reconnect found ${
        maindata.length
          ? `${maindata.length} queue${maindata.length > 1 ? "s" : ""}. Resuming all auto reconnect queue`
          : "0 queue"
      }`,
      "ready",
    );

    for (const data of maindata) {
      let channel = client.channels.cache.get(data.TextId);
      if (!channel) {
        channel = await client.channels.fetch(data.TextId).catch(() => null);
      }
      let voice = client.channels.cache.get(data.VoiceId);
      if (!voice) {
        voice = await client.channels.fetch(data.VoiceId).catch(() => null);
      }

      if (!channel || !voice) {
        client.logger.log(
          `[247] Skipping voice restore for Guild ${data.Guild}: TextChannel ${data.TextId} or VoiceChannel ${data.VoiceId} is missing/inaccessible.`,
          "warn",
        );
        continue;
      }

      await client.manager
        .createPlayer({
          guildId: data.Guild,
          voiceId: data.VoiceId,
          textId: data.TextId,
          deaf: true,
        })
        .catch(async (error) => {
          const errMsg = error.cause ? `${error.stack || error} | Cause: ${error.cause.stack || error.cause}` : (error.stack || error);
          client.logger.log(
            `[247] Failed to restore voice player for Guild ${data.Guild}: ${errMsg}`,
            "error",
          );
        });

      await new Promise((resolve) =>
        setTimeout(resolve, Math.floor(Math.random() * (780 - 500 + 1)) + 780),
      );
    }
  },
};
