const { v2 } = require("../../utils/v2");
const { EmbedBuilder } = require("discord.js");
const Wait = require("util").promisify(setTimeout);

module.exports = {
  name: "stop",
  category: "Music",
  cooldown: 3,
  description: "Stops the music",
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

    player.queue.clear();
    player.data.delete("autoplay");
    player.loop = "none";
    player.playing = false;
    player.paused = false;
    player.autoplay = false;
    await player.skip();
    Wait(500);
    const thing = new EmbedBuilder()
      
      .setDescription(`${client.emoji.tick} | Stopped the music`);
    message.reply(v2({ embeds: [thing] }));
  },
};
