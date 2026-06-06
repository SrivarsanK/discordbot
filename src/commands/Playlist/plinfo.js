const playlist = require("./playlist");

module.exports = {
  name: "plinfo",
  aliases: ["plinfo"],
  category: "Playlist",
  cooldown: 3,
  description: "Show one of your playlists.",
  args: true,
  usage: "playlist name",
  userPrams: [],
  botPrams: ["EmbedLinks"],
  owner: false,
  player: false,
  inVoiceChannel: false,
  sameVoiceChannel: false,
  execute: async (message, args, client, prefix) => {
    return playlist.execute(message, ["info", ...args], client, prefix);
  },
};
