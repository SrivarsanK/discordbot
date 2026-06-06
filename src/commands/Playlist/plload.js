const playlist = require("./playlist");

module.exports = {
  name: "plload",
  aliases: ["plload"],
  category: "Playlist",
  cooldown: 3,
  description: "Load one of your playlists.",
  args: true,
  usage: "playlist name",
  userPrams: [],
  botPrams: ["EmbedLinks"],
  owner: false,
  player: false,
  inVoiceChannel: true,
  sameVoiceChannel: true,
  execute: async (message, args, client, prefix) => {
    return playlist.execute(message, ["load", ...args], client, prefix);
  },
};
