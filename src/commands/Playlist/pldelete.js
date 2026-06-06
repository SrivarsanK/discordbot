const playlist = require("./playlist");

module.exports = {
  name: "pldelete",
  aliases: ["pldelete"],
  category: "Playlist",
  cooldown: 3,
  description: "Delete one of your playlists.",
  args: true,
  usage: "playlist name",
  userPrams: [],
  botPrams: ["EmbedLinks"],
  owner: false,
  player: false,
  inVoiceChannel: false,
  sameVoiceChannel: false,
  execute: async (message, args, client, prefix) => {
    return playlist.execute(message, ["delete", ...args], client, prefix);
  },
};
