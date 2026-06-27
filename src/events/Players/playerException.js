const { v2 } = require("../../utils/v2");

module.exports = {
  name: "playerException",
  run: async (client, player, reason) => {
    const errorMsg = reason?.exception?.message || reason?.message || (typeof reason === 'string' ? reason : JSON.stringify(reason));
    client.logger.log(`Player exception: ${errorMsg}`, "error");

    // If the exception is from Deezer (missing metadata / identifier), retry the current track via YouTube
    const isDeezerError = errorMsg.toLowerCase().includes("deezer") || errorMsg.toLowerCase().includes("stream metadata");
    const currentTrack = player.queue.current;

    if (isDeezerError && currentTrack && !currentTrack._retried) {
      client.logger.log(`[Music] Deezer source failed for "${currentTrack.title}". Retrying via YouTube...`, "warn");
      currentTrack._retried = true;

      try {
        // Search for the same track using YouTube
        const query = [currentTrack.author, currentTrack.title].filter(Boolean).join(" - ");
        const result = await client.manager.search(query, {
          engine: "youtube",
          requester: currentTrack.requester,
        });

        if (result?.tracks?.length) {
          const ytTrack = result.tracks[0];

          // Use Shoukaku's lower-level playTrack to bypass Kazagumo's resolve loop
          // which would re-resolve via the same broken Deezer path
          await player.shoukaku.playTrack({
            track: { encoded: ytTrack.track },
          });

          // Update the current track metadata so the now-playing display is correct
          currentTrack.track = ytTrack.track;
          currentTrack.realUri = ytTrack.realUri || ytTrack.uri;
          currentTrack.uri = ytTrack.uri;
          currentTrack.sourceName = ytTrack.sourceName || "youtube";
          currentTrack.identifier = ytTrack.identifier;
          player.playing = true;

          client.logger.log(`[Music] Successfully retried "${currentTrack.title}" via YouTube.`, "ready");
          return; // Don't send the error message to the channel
        }
      } catch (retryErr) {
        client.logger.log(`[Music] YouTube retry also failed: ${retryErr.message || retryErr}`, "error");
      }
    }

    const channel = client.channels.cache.get(player.textId);
    if (channel) {
      channel.send(v2({
        content: `${client.emoji.cross} | A playback exception occurred: \`${errorMsg}\`. Skipping to the next track...`
      })).catch(() => null);
    }
  },
};
