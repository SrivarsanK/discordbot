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
      const channel = client.channels.cache.get(data.TextId);
      const voice = client.channels.cache.get(data.VoiceId);

      if (!channel || !voice) {
        await data.deleteOne();
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
          client.logger.log(
            `[247] Failed to restore ${data.Guild}: ${error.stack || error}`,
            "error",
          );
          await data.deleteOne().catch(() => null);
        });

      await new Promise((resolve) =>
        setTimeout(resolve, Math.floor(Math.random() * (780 - 500 + 1)) + 780),
      );
    }
  },
};
