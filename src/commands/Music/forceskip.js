const { v2 } = require("../../utils/v2");
const { EmbedBuilder } = require("discord.js");
const { trackLink } = require("../../utils/botMeta");

module.exports = {
  name: "forceskip",
  aliases: ["fs"],
  category: "Music",
  cooldown: 3,
  description: "To force skip the current playing song.",
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

    const song = player.queue.current;

    await player.skip();

    const emojiskip = message.client.emoji.skip;

    const thing = new EmbedBuilder()
      .setDescription(
        `${client.emoji.tick} | Skipped - ${trackLink(song)}`,
      )
      ;
    return message.reply(v2({ embeds: [thing] }));
  },
};
