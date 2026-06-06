const playlist = require("./playlist");

module.exports = {
  name: "plcreate",
  aliases: ["plcreate"],
  category: "Playlist",
  cooldown: 3,
  description: "Create one of your playlists.",
  args: true,
  usage: "playlist name",
  userPrams: [],
  botPrams: ["EmbedLinks"],
  owner: false,
  player: false,
  inVoiceChannel: false,
  sameVoiceChannel: false,
  execute: async (message, args, client, prefix) => {
    return playlist.execute(message, ["create", ...args], client, prefix);
  },
};
