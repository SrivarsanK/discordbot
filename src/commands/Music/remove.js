const { v2 } = require("../../utils/v2");
const { EmbedBuilder } = require("discord.js");
const { trackLink } = require("../../utils/botMeta");

module.exports = {
  name: "remove",
  aliases: ["hata"],
  category: "Music",
  cooldown: 3,
  description: "Remove song from the queue",
  args: true,
  usage: "Number of song in queue",
  userPrams: [],
  botPrams: ["EMBED_LINKS"],
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

    const position = Number(args[0]) - 1;
    if (position > player.queue.length) {
      const number = position + 1;
      const thing = new EmbedBuilder()
        
        .setDescription(
          `${client.emoji.cross} | No songs at number ${number}.\nTotal Songs: ${player.queue.length}`,
        );
      return message.reply(v2({ embeds: [thing] }));
    }

    const song = player.queue[position];

    await player.queue.splice(position, 1);

    const emojieject = client.emoji.remove;

    const thing = new EmbedBuilder()
      
      .setDescription(
        `${client.emoji.tick} | Removed - ${trackLink(song)}`,
      );
    return message.reply(v2({ embeds: [thing] }));
  },
};
