const { v2 } = require("../../utils/v2");
const { EmbedBuilder } = require("discord.js");

module.exports = {
  name: "shuffle",
  category: "Music",
  description: "Shuffle queue",
  cooldown: 3,
  args: false,
  usage: "",
  userPrams: [],
  botPrams: ["EMBED_LINKS"],
  dj: true,
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
    const thing = new EmbedBuilder()
      .setDescription(`${client.emoji.tick} | Shuffled the queue`)
      ;
    await player.queue.shuffle();
    return message
      .reply(v2({ embeds: [thing] }))
      .catch((error) => client.logger.log(error, "error"));
  },
};
