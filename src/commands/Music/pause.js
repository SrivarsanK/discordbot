const { v2 } = require("../../utils/v2");
const { EmbedBuilder } = require("discord.js");
const { trackLink } = require("../../utils/botMeta");

module.exports = {
  name: "pause",
  category: "Music",
  cooldown: 3,
  description: "Pause the currently playing music",
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
    if (player.shoukaku.paused) {
      const thing = new EmbedBuilder()
        
        .setDescription(
          `${client.emoji.tick} | The player is already **paused**.`,
        );
      return message.reply(v2({ embeds: [thing] }));
    }

    await player.pause(true);

    const song = player.queue.current;

    const thing = new EmbedBuilder()
      
      .setDescription(
        `${client.emoji.tick} | **Paused** - ${trackLink(song)}`,
      );
    return message.reply(v2({ embeds: [thing] }));
  },
};
