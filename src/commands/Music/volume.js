const { v2 } = require("../../utils/v2");
const { EmbedBuilder } = require("discord.js");
const Wait = require("util").promisify(setTimeout);

module.exports = {
  name: "volume",
  aliases: ["v", "vol"],
  category: "Music",
  cooldown: 3,
  description: "Change volume of currently playing music",
  args: false,
  usage: "",
  userPrams: [],
  botPrams: ["EmbedLinks"],
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

    if (!args.length) {
      const thing = new EmbedBuilder()
        
        .setDescription(
          `${client.emoji.tick} | Player Current Volume: **${player.volume}%**`,
        );
      return message.reply(v2({ embeds: [thing] }));
    }

    const volume = Number(args[0]);

    if (!volume || volume < 0 || volume > 1000) {
      const thing = new EmbedBuilder()
        
        .setDescription(
          `${client.emoji.cross} | Usage: **${prefix}volume** <Number of volume between 0 - 100>`,
        );
      return message.reply(v2({ embeds: [thing] }));
    }

    await player.setVolume(volume / 1);
    Wait(500);
    if (volume > player.volume) {
      const thing = new EmbedBuilder()
        
        .setDescription(
          `${client.emoji.volumehigh} | Volume set to: **${volume}%**`,
        );
      return message.reply(v2({ embeds: [thing] }));
    } else if (volume < player.volume) {
      const thing = new EmbedBuilder()
        
        .setDescription(
          `${client.emoji.volumehigh} | Volume set to: **${volume}%**`,
        );
      return message.reply(v2({ embeds: [thing] }));
    } else {
      const thing = new EmbedBuilder()
        
        .setDescription(
          `${client.emoji.volumehigh} | Volume set to: **${volume}%**`,
        );
      return message.reply(v2({ embeds: [thing] }));
    }
  },
};
