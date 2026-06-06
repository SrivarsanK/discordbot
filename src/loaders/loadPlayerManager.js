/** @format */

/** @format */

const { Kazagumo } = require("kazagumo");
const { Connectors } = require("shoukaku");
const Spotify = require("kazagumo-spotify");

const searchEngines = {
  DEEZER: "dzsearch:",
  SPOTIFY: "spotify",
  YOUTUBE: "ytsearch:",
  JIO_SAAVAN: "jssearch:",
  SOUNDCLOUD: "scsearch:",
  YOUTUBE_MUSIC: "ytmsearch:",
};

module.exports = function loadPlayerManager(client) {
  const plugins = [];
  const spotify = client.config.spotify || {};

  if (spotify.clientId && spotify.clientSecret) {
    plugins.push(
      new Spotify({
        clientId: spotify.clientId,
        clientSecret: spotify.clientSecret,
        playlistPageLimit: spotify.playlistPageLimit || 1,
        albumPageLimit: spotify.albumPageLimit || 1,
        searchLimit: spotify.searchLimit || 10,
        searchMarket: spotify.searchMarket || "US",
      }),
    );
  }

  const defaultSource = normalizeSource(client.config.node_source);

  const nodes = (client.config.nodes || []).filter(node => node && node.url && node.url.trim() !== "");

  const manager = new Kazagumo(
    {
      plugins,
      defaultSearchEngine: toKazagumoEngine(client.config.node_source),
      defaultSource,
      send: (guildId, payload) => {
        const guild = client.guilds.cache.get(guildId);
        if (guild) guild.shard.send(payload);
      },
    },
    new Connectors.DiscordJS(client),
    nodes,
    client.config.node_options,
  );

  manager.searchEngines = searchEngines;
  manager.defaultSearchEngine = client.config.node_source;
  manager.defaultSource = defaultSource;

  client.manager = manager;
  return manager;
};

function normalizeSource(source) {
  if (!source) return "ytsearch:";
  if (source.endsWith(":")) return source;
  if (source.endsWith("search")) return `${source}:`;
  return `${source}search:`;
}

function toKazagumoEngine(source) {
  const normalized = String(source || "").toLowerCase();
  if (normalized.startsWith("sc") || normalized.startsWith("soundcloud")) {
    return "soundcloud";
  }
  if (normalized.startsWith("ytm") || normalized.includes("youtube_music")) {
    return "youtube_music";
  }
  return "youtube";
}
