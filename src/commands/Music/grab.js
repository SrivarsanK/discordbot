const { v2 } = require("../../utils/v2");
const {
  EmbedBuilder,
  MessageFlags,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
} = require("discord.js");
const { convertTime } = require("../../utils/convert.js");

module.exports = {
  name: "grab",
  aliases: ["save"],
  category: "Music",
  cooldown: 3,
  description: "Grabs and sends you the song that is currently playing.",
  args: false,
  usage: "",
  userPerms: [],
  owner: false,
  player: true,
  inVoiceChannel: true,
  sameVoiceChannel: true,
  execute: async (message, args, client, prefix) => {
    const player = client.manager.players.get(message.guild.id);

    if (!player.queue.current) {
      const thing = new client.embed().d(`Play a song first!`);
      return message.channel.send(v2({ embeds: [thing] }));
    }

    const song = player.queue.current;
    const total = song.length;
    const current = player.position;

    const dmbut = new ButtonBuilder()
      .setLabel("Check Your DMs")
      .setStyle(ButtonStyle.Link)
      .setURL(`https://discord.com/users/${client.id}`);
    const row = new ActionRowBuilder().addComponents(dmbut);

    const dm = new EmbedBuilder()
      .setAuthor({
        name: message.author.tag,
        iconURL: message.author.avatarURL(),
      })
      .setDescription(`:mailbox_with_mail: \`Check Your DMs!\``)
      
      .setFooter({ text: `Requested By ${message.author.tag}` })
      .setTimestamp();
    message.reply(v2({ embeds: [dm], components: [row] }));

    const urlbutt = new ButtonBuilder()
      .setLabel("Search")
      .setStyle(ButtonStyle.Link)
      .setURL(song.uri);
    const row2 = new ActionRowBuilder().addComponents(urlbutt);
    const embed = new EmbedBuilder()
      .setDescription(
        `**Song Details** \n\n > **__Song Name__**: [${song.title}](${song.uri}) \n > **__Song Duration__**: \`[${convertTime(song.duration)}]\` \n > **__Song Played By__**: [<@${song.requester.id}>] \n > **__Song Saved By__**: [<@${message.author.id}>]`,
      )
      .setThumbnail(song.thumbnail)
      
      .addFields([
        {
          name: "\u200b",
          value: `\`${convertTime(current)} / ${convertTime(total)}\``,
        },
      ]);
    return message.author
      .send(v2({ embeds: [embed], components: [row2] }))
      .catch(() => null);
  },
};
