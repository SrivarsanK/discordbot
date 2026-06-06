const { v2 } = require("../../utils/v2");
const {
  EmbedBuilder,
  MessageFlags,
  ButtonBuilder,
  ActionRowBuilder,
  ButtonStyle,
} = require("discord.js");
const { convertTime } = require("../../utils/convert.js");
const _ = require("lodash");

module.exports = {
  name: "queue",
  category: "Music",
  aliases: ["q"],
  cooldown: 3,
  description: "Show the music queue, now playing, and previous tracks.",
  args: false,
  usage: "",
  userPrams: [],
  botPrams: ["EMBED_LINKS"],
  owner: false,
  player: true,
  inVoiceChannel: false,
  sameVoiceChannel: false,

  execute: async (message, args, client, prefix) => {
    const player = client.manager.players.get(message.guild.id);
    if (!player || !player.queue.current) {
      return message.channel.send(v2({
        embeds: [client.embed().d("Play a song first!")],
      }));
    }

    const previousTracks = player.queue.previous.map((t, i) =>
      `-# ${client.emoji.dot} ${i}: ${t.title.substring(0, 30)} | [${t.requester.displayName}](https://discord.com/users/${t.requester.id}) ${
        t.isStream ? "◉ LIVE" : convertTime(t.length)
      }`
    );
      

const currentTrack = `-# ${client.emoji.dot} ${previousTracks.length + 1}: ${player.queue.current.title.substring(0, 25)} | [${player.queue.current.requester.displayName}](https://discord.com/users/${player.queue.current.requester.id}) ${
  player.queue.current.isStream ? "LIVE" : convertTime(player.queue.current.length)
} ${client.emoji.tick}`;
      

    const upcomingTracks = player.queue.map((t, i) =>
      `-# ${client.emoji.dot} ${i + previousTracks.length + 1}: ${t.title.substring(0, 30)} | [${t.requester.displayName}](https://discord.com/users/${t.requester.id}) ${convertTime(t.length)}`
    );
      

    const fullQueue = [...previousTracks, currentTrack, ...upcomingTracks];
    const chunks = _.chunk(fullQueue, 10); // 10 per page
    const pages = chunks.map((chunk) => chunk.join("\n"));

    let page = 0;

    const totalSongs = previousTracks.length + 1 + upcomingTracks.length;

    const embed = new EmbedBuilder()
      
      .setAuthor({
        name: "Queue For Current Player",
        iconURL: client.user.displayAvatarURL(),
      })
      .setDescription(pages[page])
      .setFooter({
        text: `Page ${page + 1}/${pages.length}`,
        iconURL: message.author.displayAvatarURL({ dynamic: true }),
      });

    const butPrev = new ButtonBuilder()
      .setCustomId("queue_cmd_but_2")
      .setEmoji(client.emoji.left)
      .setStyle(ButtonStyle.Secondary);

    const butStop = new ButtonBuilder()
      .setCustomId("queue_cmd_but_3")
      .setEmoji(client.emoji.cross)
      .setStyle(ButtonStyle.Secondary);

    const butNext = new ButtonBuilder()
      .setCustomId("queue_cmd_but_1")
      .setEmoji(client.emoji.right)
      .setStyle(ButtonStyle.Secondary);

    const row = new ActionRowBuilder().addComponents([
      butPrev,
      butStop,
      butNext,
    ]);

    const msg =
      totalSongs > 10
        ? await message.channel.send(v2({
            embeds: [embed],
            components: [row],
          }))
        : await message.channel.send(v2({
            embeds: [embed],
          }));

    if (totalSongs <= 10) return;

    const collector = msg.createMessageComponentCollector({
      filter: (b) => {
        if (b.user.id === message.author.id) return true;
        b.reply(v2({
          flags: MessageFlags.Ephemeral,
          content: `${client.emoji.cross} | Only **${message.author.tag}** can use this button. Run the command again to interact.`,
        }));
        return false;
      },
      time: 300_000,
      idle: 30_000,
    });

    collector.on("collect", async (button) => {
      try {
        await button.deferUpdate();
        if (button.customId === "queue_cmd_but_1") {
          page = (page + 1) % pages.length;
        } else if (button.customId === "queue_cmd_but_2") {
          page = page > 0 ? page - 1 : pages.length - 1;
        } else if (button.customId === "queue_cmd_but_3") {
          collector.stop();
          return;
        }

        const updatedEmbed = EmbedBuilder.from(embed)
          .setDescription(pages[page])
          .setFooter({
            text: `Page ${page + 1}/${pages.length}`,
            iconURL: message.author.displayAvatarURL({ dynamic: true }),
          });

        await msg.edit(v2({ embeds: [updatedEmbed] }));
      } catch (err) {
        console.error("Queue pagination error:", err);
      }
    });

    collector.on("end", async () => {
      const disabledRow = new ActionRowBuilder().addComponents(
        butPrev.setDisabled(true),
        butStop.setDisabled(true),
        butNext.setDisabled(true)
      );
      await msg.edit(v2({ components: [disabledRow] }));
    });
  },
};
