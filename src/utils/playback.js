const DEFAULT_START_TIMEOUT = 10000;

async function startPlayback(client, player, timeout = DEFAULT_START_TIMEOUT) {
  if (!player || player.playing || player.paused) return true;

  const started = waitForPlayerStart(client, player, timeout);
  const result = await player.play().catch((playError) => playError);

  // player.play() returns a result object on success; only Error instances are failures
  const isError = result instanceof Error;

  if (!isError || player.playing || player.paused) return true;

  const didStart = await started;
  if (didStart || player.playing || player.paused) return true;

  client?.logger?.log(
    `[Music] Failed to start playback: ${result.stack || result.message || result}`,
    "error",
  );
  return false;
}

function waitForPlayerStart(client, player, timeout) {
  const manager = client?.manager;
  if (!manager?.on) return Promise.resolve(false);

  return new Promise((resolve) => {
    const timer = setTimeout(() => done(false), timeout);

    const onStart = (startedPlayer) => {
      if (
        startedPlayer === player ||
        startedPlayer?.guildId === player.guildId
      ) {
        done(true);
      }
    };

    const done = (result) => {
      clearTimeout(timer);
      manager.off?.("playerStart", onStart);
      manager.removeListener?.("playerStart", onStart);
      resolve(result);
    };

    manager.on("playerStart", onStart);
  });
}

module.exports = {
  startPlayback,
};
