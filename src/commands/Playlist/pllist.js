const playlist = require("./playlist");

module.exports = {
  name: "pllist",
  aliases: ["pllist"],
  category: "Playlist",
  cooldown: 3,
  description: "List your playlists.",
  args: false,
  usage: "",
  userPrams: [],
  botPrams: ["EmbedLinks"],
  owner: false,
  player: false,
  inVoiceChannel: false,
  sameVoiceChannel: false,
  execute: async (message, args, client, prefix) => {
    return playlist.execute(message, ["list", ...args], client, prefix);
  },
};
