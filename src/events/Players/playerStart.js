const { v2 } = require("../../utils/v2");
const {
  EmbedBuilder,
  AttachmentBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  ComponentType,
} = require("discord.js");
const moment = require("moment");
require("moment-duration-format");

const Presets = require("../../schema/preset");
const VcStatus = require("../../schema/vcstatus");
const { musicCard } = require("musicard-quartz");
const { Classic } = require("musicard");
const canvafy = require("canvafy");
const { trackLink } = require("../../utils/botMeta");
const { sendWebhook } = require("../../utils/webhook");

const {
  Webhooks: { player_create },
} = require("../../config.js");

// Helper: Button row
const createButtonRow = (paused, client) =>
  new ActionRowBuilder().addComponents(
    new client.button().s(paused ? "resume" : "pause", "", paused ? client.emoji.play : client.emoji.pause),
    new client.button().s("skip", "", client.emoji.skip),
    new client.button().s("stop", "", client.emoji.stop),
    new client.button().s("loop", "", client.emoji.loop),
    new client.button().s("shuffle", "", client.emoji.shuffle)
  );

// Helper: Send Now Playing message
async function sendNowPlaying(client, player, track, presetType) {
  const channel = client.channels.cache.get(player.textId);
  if (!channel) return;

  const song = player.queue.current;
  const gud = song.title.replace(/(?:hd|full|video|official|4k|8k)/gi, "");
  const title = gud.replace(/[^\p{L}\p{N}\s\u0900-\u097F]/gu, "").replace(/\s+/g, " ").trim();
  const auth = song.author;
  const total = song.length;
  const thumb = (
    song.thumbnail || client.user.displayAvatarURL({ extension: "png", size: 512 })
  ).replace("hqdefault", "maxresdefault");
  const row = createButtonRow(false, client);

  switch (presetType) {
    case 1: {
      const card = new musicCard()
        .setName(auth)
        .setAuthor(title)
        
        .setTheme("quartz+")
        .setBrightness(50)
        .setThumbnail(thumb)
        .setProgress(0)
        .setStartTime("0:00")
        .setEndTime(moment.duration(total).format("hh:mm:ss"));
      const attachment = new AttachmentBuilder(await card.build(), { name: "now-playing.png" });

      return channel.send(v2({
        embeds: [new EmbedBuilder().setImage("attachment://now-playing.png")],
        files: [attachment],
        components: [row],
      }));
    }

    case 2: {
      const musicard = await Classic({
        thumbnailImage: thumb,
        backgroundColor: "#070707",
        progress: 0,
        progressColor: "#FF7A00",
        progressBarColor: "#5F2D00",
        name: title,
        nameColor: "#FF7A00",
        author: `By ${auth}`,
        authorColor: "#696969",
        startTime: "0:00",
        endTime: moment.duration(total).format("hh:mm:ss"),
        timeColor: "#FF7A00",
      });
      const attachment = new AttachmentBuilder(musicard, { name: "now-playing.png" });

      return channel.send(v2({
        embeds: [new EmbedBuilder().setImage("attachment://now-playing.png")],
        files: [attachment],
        components: [row],
      }));
    }

    case 3: {
      const spotify = await new canvafy.Spotify()
        .setAuthor(auth)
        .setTimestamp(1000, total)
        .setImage(thumb)
        .setTitle(title)
        .setBlur(1)
        .setOverlayOpacity(0.5)
        .build();
      const attachment = new AttachmentBuilder(spotify, { name: "now-playing.png" });

      return channel.send(v2({
        embeds: [new EmbedBuilder().setImage("attachment://now-playing.png")],
        files: [attachment],
        components: [row],
      }));
    }

    case 4: {
      const letn = Math.round((Date.now() + total) / 1000);
      const embed = new EmbedBuilder()
        .setAuthor({ name: `${client.user.username} Is Playing`, iconURL: track.requester.displayAvatarURL() })
        .setDescription(
          `${client.emoji.playing} ${trackLink(song, title)}\n\n> Ends <t:${letn}:R>\n> Author ${auth}\n> Requester ${track.requester.displayName}`
        )
        ;

      const eqrow = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId("disable_h")
          .setPlaceholder("Select Filters")
          .addOptions([
            { label: "Reset Filters", value: "clearbut" },
            { label: "BassBoost", value: "bassbut" },
            { label: "8D", value: "8dbut" },
            { label: "NightCore", value: "nightbut" },
            { label: "Pitch", value: "pitchbut" },
            { label: "Lofi", value: "lofibut" },
            { label: "Distort", value: "distortbut" },
            { label: "Speed", value: "speedbut" },
            { label: "Vaporwave", value: "vapobut" },
          ])
      );

      return channel.send(v2({
        embeds: [embed],
        components: [eqrow, row],
      }));
    }

    default: {
      return channel.send(v2({
        embeds: [
          new EmbedBuilder()
            .setThumbnail(thumb)
            .setAuthor({ name: `| Started Playing`, iconURL: track.requester.displayAvatarURL() })
            .setDescription(`${client.emoji.playing} ${trackLink(song, title)}`)
            ,
        ],
        components: [row],
      }));
    }
  }
}

// MAIN HANDLER
module.exports = {
  name: "playerStart",
  run: async (client, player, track) => {
    const guild = client.guilds.cache.get(player.guildId);
    if (!guild) return;

    sendWebhook(client, player_create, {
      embeds: [
        new EmbedBuilder()
          
          .setAuthor({ name: `Player Started`, iconURL: client.user.displayAvatarURL() })
          .setDescription(`**Server ID:** ${player.guildId}\n**Server Name:** ${guild.name}\n**Req:** ${track.requester}`),
      ],
    }, "player start");

    const existing = await VcStatus.findOne({ guildId: guild.id });
    const presetDoc = await Presets.findOne({ guildId: guild.id });
    const presetType = presetDoc?.presetType || 0;
    const nplaying = await sendNowPlaying(client, player, track, presetType);
    if (!nplaying) return;

    player.data.set("message", nplaying);

    if (existing) {
      client.rest
        .put(`/channels/${player.voiceId}/voice-status`, {
          body: { status: `${client.emoji.playing} ${track.title.substring(0, 19)}` },
        })
        .catch(() => null);
    }

    const collector = nplaying.createMessageComponentCollector({
      time: track.duration,
      componentType: ComponentType.MessageComponent,
    });

    collector.on("collect", async (interaction) => {
      if (interaction.member.voice.channelId !== player.voiceId) {
        return interaction.reply(v2({
          content: `${client.emoji.cross} | You must be in the same voice channel.`,
          ephemeral: true,
        }));
      }

      if (interaction.isButton()) {
        switch (interaction.customId) {
          case "pause":
            player.pause(true);
            await interaction.update(v2({ components: [createButtonRow(true, client)] }));
            break;

          case "resume":
            player.pause(false);
            await interaction.update(v2({ components: [createButtonRow(false, client)] }));
            break;

          case "skip":
            player.skip();
            await interaction.reply(v2({ content: `${client.emoji.skip} | Skipped the track.`, ephemeral: true }));
            break;

          case "stop":
            player.queue.clear();
            player.data.delete("autoplay");
            player.loop = "none";
            player.playing = false;
            player.paused = false;
            await player.skip();
            await interaction.reply(v2({ content: `${client.emoji.stop} | Stopped playing`, ephemeral: true }));
            break;

          case "loop":
            player.setLoop(player.loop === "none" ? "track" : "none");
            await interaction.reply(v2({
              content: `${client.emoji.replay} | Looping is now **${player.loop === "none" ? "off" : "on"}**.`,
              ephemeral: true,
            }));
            break;

          case "shuffle":
            player.queue.shuffle();
            await interaction.reply(v2({ content: `${client.emoji.shuffle} | Queue shuffled.`, ephemeral: true }));
            break;
        }
      } else if (interaction.isStringSelectMenu()) {
        await interaction.deferReply({ ephemeral: true });
        const val = interaction.values[0];

        const filters = {
          clearbut: { op: "filters", guildId: interaction.guild.id },
          bassbut: { op: "filters", guildId: interaction.guild.id, equalizer: Array(14).fill({}).map((_, i) => ({ band: i, gain: i < 2 || i > 11 ? 0.1 : -0.05 })) },
          "8dbut": { op: "filters", guildId: interaction.guild.id, rotation: { rotationHz: 0.2 } },
          nightbut: { op: "filters", guildId: interaction.guild.id, equalizer: [{ band: 1, gain: 0.3 }, { band: 0, gain: 0.3 }], timescale: { pitch: 1.2 }, tremolo: { depth: 0.3, frequency: 14 } },
          pitchbut: { op: "filters", guildId: interaction.guild.id, timescale: { pitch: 1.245, rate: 1.921 } },
          lofibut: { op: "filters", guildId: interaction.guild.id, equalizer: Array(14).fill({}).map((_, i) => ({ band: i, gain: i <= 4 ? -0.25 + i * 0.05 : (i - 5) * 0.05 })) },
          distortbut: { op: "filters", guildId: interaction.guild.id, equalizer: Array(14).fill({}).map((_, i) => ({ band: i, gain: 0.5 - i * 0.05 })) },
          speedbut: { op: "filters", guildId: interaction.guild.id, timescale: { speed: 1.501, pitch: 1.245, rate: 1.921 } },
          vapobut: { op: "filters", guildId: interaction.guild.id, equalizer: [{ band: 1, gain: 0.3 }, { band: 0, gain: 0.3 }], timescale: { pitch: 0.5 }, tremolo: { depth: 0.3, frequency: 14 } },
        };

        if (filters[val]) {
          await player.shoukaku.setFilters(filters[val]);
          await interaction.editReply(v2({ content: `Enabled **${val.replace("but", "")}**.` }));
        } else {
          await interaction.editReply(v2({ content: "Unknown filter selected." }));
        }
      }
    });
  },
};
