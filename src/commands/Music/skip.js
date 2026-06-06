const { v2 } = require("../../utils/v2");
const { EmbedBuilder } = require("discord.js");
const { trackLink } = require("../../utils/botMeta");

module.exports = {
  name: "skip",
  aliases: ["s"],
  category: "Music",
  cooldown: 3,
  description: "To skip the current playing song.",
  botPrams: ["EMBED_LINKS"],
  player: true,
  inVoiceChannel: true,
  sameVoiceChannel: true,
  execute: async (message, args, client, prefix) => {
    const player = client.manager.players.get(message.guild.id);
    if (
      player.queue.size == 0 &&
      !player.data.get("autoplay") &&
      !player.loop === "track"
    ) {
      return message.reply(v2({
        embeds: [new client.embed().d(`Play a song first!`)],
      }));
    }
    await player.skip();

    const thing = new client.embed().d(
      `${client.emoji.tick} | **Skipped** - ${trackLink(player.queue.current)}`,
    );
    return message.reply(v2({ embeds: [thing] }));
  },
};
