const { v2 } = require("../../utils/v2");
const { AttachmentBuilder, EmbedBuilder } = require("discord.js");
const canvafy = require("canvafy");
const { convertTime } = require("../../utils/convert.js");
const { trackLink } = require("../../utils/botMeta");

module.exports = {
  name: "nowplaying",
  aliases: ["np"],
  category: "Music",
  description: "Show now playing song",
  args: false,
  usage: "",
  userPrams: [],
  botPrams: ["EmbedLinks"],
  owner: false,
  player: true,
  inVoiceChannel: false,
  sameVoiceChannel: false,
  execute: async (message, args, client) => {
    const player = client.manager.players.get(message.guild.id);
    const song = player?.queue?.current;

    if (!song) {
      return message.channel.send(v2({
        embeds: [
          new client.embed().d(
            `${client.emoji.cross} | No song is currently playing in this server.`,
          ),
        ],
      }));
    }

    const current = player.position || 0;
    const total = song.length || 0;
    const title =
      song.title.length > 25 ? `${song.title.slice(0, 25)}.....` : song.title;

    const image = await new canvafy.Spotify({
      font: {
        name: "Poppins",
        path: "assets/fonts/Poppins/Poppins-Regular.ttf",
      },
    })
      .setAuthor(song.author || "Unknown artist")
      .setTimestamp(current, total)
      .setImage(song.thumbnail || client.user.displayAvatarURL({ extension: "png" }))
      .setTitle(title)
      .setBlur(1)
      .setOverlayOpacity(0.5)
      .build();

    const attachment = new AttachmentBuilder(image, { name: "now-playing.png" });
    const embed = new EmbedBuilder()
      
      .setAuthor({
        name: "| Now Playing",
        iconURL: client.user.displayAvatarURL(),
      })
      .setDescription(
        `${client.emoji.playing} **Song** ${trackLink(song, title)}\n` +
          `${client.emoji.dot} **Duration:** \`${convertTime(current)} / ${convertTime(total)}\`\n` +
          `${client.emoji.dot} **Requester:** ${song.requester}`,
      )
      .setImage("attachment://now-playing.png");

    return message.channel.send(v2({ embeds: [embed], files: [attachment] }));
  },
};
