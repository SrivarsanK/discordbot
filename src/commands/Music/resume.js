const { v2 } = require("../../utils/v2");
const { EmbedBuilder } = require("discord.js");
const { trackLink } = require("../../utils/botMeta");

module.exports = {
  name: "resume",
  aliases: ["r"],
  category: "Music",
  cooldown: 3,
  description: "Resume currently playing music",
  args: false,
  usage: "Number of song in queue",
  userPrams: [],
  botPrams: ["EMBED_LINKS"],
  dj: true,
  owner: false,
  player: true,
  inVoiceChannel: true,
  sameVoiceChannel: true,
  execute: async (message, args, client, prefix) => {
    const player = client.manager.players.get(message.guild.id);
    const song = player.queue.current;

    if (!song) {
      return message.channel.send(v2({
        embeds: [new client.embed().d(`Play a song first!`)],
      }));
    }

    const emojiresume = client.emoji.resume;

    if (!player.shoukaku.paused) {
      const thing = new EmbedBuilder()
        
        .setDescription(
          `${client.emoji.cross} | The player is already **resumed**.`,
        );
      return message.reply(v2({ embeds: [thing] }));
    }

    await player.pause(false);

    const thing = new EmbedBuilder()
      .setDescription(
        `${client.emoji.tick} | **Resumed** - ${trackLink(song)}`,
      )
      ;
    return message.reply(v2({ embeds: [thing] }));
  },
};
