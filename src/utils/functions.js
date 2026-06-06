/** @format */

const { startPlayback } = require("./playback");

function levenshtein(a, b) {
  a = a.toLowerCase();
  b = b.toLowerCase();
  const matrix = [];

  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      matrix[i][j] = b[i - 1] === a[j - 1]
        ? matrix[i - 1][j - 1]
        : Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
    }
  }

  return matrix[b.length][a.length];
}

function isTooSimilar(title1, title2) {
  if (!title1 || !title2) return false;
  const norm1 = title1.toLowerCase().replace(/[^\w\s]/gi, "");
  const norm2 = title2.toLowerCase().replace(/[^\w\s]/gi, "");
  const maxLen = Math.max(norm1.length, norm2.length);
  if (maxLen === 0) return false;

  const dist = levenshtein(norm1, norm2);
  const similarity = 1 - dist / maxLen;
  return similarity >= 0.3;
}

async function autoplay(player, client) {
  try {
    const track = player.getPrevious();
    if (!track) return;

    const TSource = track.sourceName;
    const playedTracks = player.data.get("playedTracks") || new Set();
    const originalTitle = track.title?.trim();
    if (!originalTitle) return;

    let engine;
    let source;
    let searchQuery;

    switch (TSource) {
      case "spotify":
        engine = "spotify";
        searchQuery = `${track.author} ${track.title}`;
        break;
      case "soundcloud":
        source = "scsearch:";
        searchQuery = `${track.author} ${track.title}`;
        break;
      case "applemusic":
        source = "amsearch:";
        searchQuery = `${track.author} ${track.title}`;
        break;
      case "deezer":
        source = "dzsearch:";
        searchQuery = `${track.author} ${track.title}`;
        break;
      case "youtube":
        source = "ytsearch:";
        searchQuery = `https://www.youtube.com/watch?v=${track.identifier}&list=RD${track.identifier}`;
        break;
      case "youtube_music":
        source = "ytmsearch:";
        searchQuery = `${track.author} ${track.title}`;
        break;
      default:
        return;
    }

    const res = await player.search(searchQuery, {
      requester: track.requester,
      engine,
      source,
    });

    if (!res || !res.tracks.length) return;

    let nextTrack;
    for (const candidate of res.tracks) {
      if (
        !playedTracks.has(candidate.identifier) &&
        !isTooSimilar(candidate.title, originalTitle)
      ) {
        nextTrack = candidate;
        break;
      }
    }

    if (!nextTrack) return;

    playedTracks.add(nextTrack.identifier);
    player.data.set("playedTracks", playedTracks);
    player.queue.add(nextTrack);
    if (!player.playing && !player.paused) await startPlayback(client, player);
  } catch (e) {
    client?.logger?.log(`Autoplay encountered an error: ${e}`, "error");
  }
}


module.exports = {
  autoplay,
};  
