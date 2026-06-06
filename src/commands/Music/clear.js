const { v2 } = require("../../utils/v2");
const { EmbedBuilder } = require("discord.js");

module.exports = {
  name: "clear",
  aliases: ["cq", "clear"],
  category: "Music",
  cooldown: 3,
  description: "Removes all songs in the music queue.",
  args: false,
  usage: "",
  userPerms: [],
  owner: false,
  player: true,
  inVoiceChannel: true,
  sameVoiceChannel: true,
  execute: async (message, args, client, prefix) => {
    const player = client.manager.players.get(message.guild.id);
    if (!player.queue.current) {
      return message.channel.send(v2({
        embeds: [new client.embed().d(`Play a song first!`)],
      }));
    }
    player.queue.clear();
    const thing = new client.embed().d(
      `${client.emoji.tick} Removed all songs from the queue.`,
    );
    return message.reply(v2({ embeds: [thing] }));
  },
};
