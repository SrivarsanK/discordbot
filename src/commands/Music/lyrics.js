const { v2 } = require("../../utils/v2");
const { EmbedBuilder } = require("discord.js");
const { Google } = require("@flytri/lyrics-finder");

module.exports = {
  name: "lyrics",
  category: "Music",
  cooldown: 3,
  description: "Gets the lyrics of a song.",
  userPrems: [],
  usage: "<song name>",
  player: true,
  args: false,
  inVoiceChannel: true,
  sameVoiceChannel: true,

  execute: async (message, args, client, prefix) => {
    const player = client.manager.players.get(message.guild.id);

    const dhund = args ? args : player.queue.current.title;
    const aagya = await Google(`${dhund}`, `en`).catch((e) => {
      return message.reply(v2({
        embeds: [
          new EmbedBuilder()
            .setDescription(`${client.emoji.cross} No lyrics found.`)
            ,
        ],
      }));
    });
    if (aagya.lyrics) {
      const panda = new EmbedBuilder()
        
        .setDescription(
          aagya.lyrics?.length < 4096
            ? aagya?.lyrics
            : aagya.lyrics?.slice(0, 4080) + "\n..........",
        );
      message.channel.send(v2({ embeds: [panda] }));
    }
  },
};
