const playlist = require("./playlist");

module.exports = {
  name: "plrename",
  aliases: ["plrename", "plr"],
  category: "Playlist",
  cooldown: 5,
  description: "Rename one of your playlists.",
  args: true,
  usage: "old_name new_name",
  userPrams: [],
  botPrams: ["EmbedLinks"],
  owner: false,
  player: false,
  inVoiceChannel: false,
  sameVoiceChannel: false,
  execute: async (message, args, client, prefix) => {
    return playlist.execute(message, ["rename", ...args], client, prefix);
  },
};
