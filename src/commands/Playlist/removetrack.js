const playlist = require("./playlist");

module.exports = {
  name: "removetrack",
  aliases: ["plremovet"],
  category: "Playlist",
  cooldown: 3,
  description: "Remove a track from one of your playlists.",
  args: true,
  usage: "playlist name track number",
  userPrams: [],
  botPrams: ["EmbedLinks"],
  owner: false,
  player: false,
  inVoiceChannel: false,
  sameVoiceChannel: false,
  execute: async (message, args, client, prefix) => {
    return playlist.execute(message, ["remove", ...args], client, prefix);
  },
};
