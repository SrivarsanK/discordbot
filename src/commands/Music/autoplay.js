const { v2 } = require("../../utils/v2");
const { EmbedBuilder, MessageFlags, Embed } = require("discord.js");

module.exports = {
  name: "autoplay",
  aliases: ["ap"],
  category: "Music",
  cooldown: 3,
  description: "Toggle music autoplay",
  args: false,
  usage: "",
  userPrams: [],
  botPrams: ["EmbedLinks"],
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
    const autoplay = player.data.get("autoplay");
    const song = player.queue.current;

    if (autoplay) {
      player.data.set("autoplay", false);
      const thing = new EmbedBuilder().setAuthor({
        name: "Autoplay is now disabled",
        iconURL: message.author.displayAvatarURL(),
      });
      return message.channel.send(v2({ embeds: [thing] }));
    } else {
      const identifier = player.queue.current.identifier;
      player.data.set("autoplay", true);
      player.data.set("requester", client.user);
      player.data.set("identifier", identifier);
      const thing = new EmbedBuilder().setAuthor({
        name: "Autoplay is now enabled",
        iconURL: message.author.displayAvatarURL(),
      });
      return message.channel.send(v2({ embeds: [thing] }));
    }
  },
};
