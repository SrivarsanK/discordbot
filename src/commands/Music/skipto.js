const { v2 } = require("../../utils/v2");
const { EmbedBuilder } = require("discord.js");

module.exports = {
  name: "skipto",
  aliases: ["jump"],
  category: "Music",
  description: "Forward song",
  args: true,
  usage: "<Number of song in queue>",
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

    const position = Number(args[0]);

    if (!position || position < 0 || position > player.queue.length) {
      const thing = new EmbedBuilder()
        
        .setDescription(
          `${client.emoji.cross} | Usage: **${message.client.prefix}skipto** <Number of song in queue>`,
        );
      return message.reply(v2({ embeds: [thing] }));
    }
    if (args[0] == 1) player.skip();

    player.queue.splice(0, position - 1);
    await player.skip();

    const thing = new EmbedBuilder()
      .setDescription(`${client.emoji.tick} | Forward **${position}** Songs`)
      ;
    return message.reply(v2({ embeds: [thing] }));
  },
};
