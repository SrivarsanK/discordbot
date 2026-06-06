const { v2 } = require("../../utils/v2");
const { EmbedBuilder, PermissionsBitField } = require("discord.js");
const Playlist = require("../../schema/playlist");
const { convertTime } = require("../../utils/convert.js");
const { startPlayback } = require("../../utils/playback");

const MAX_PLAYLISTS = 10;
const MAX_TRACKS = 100;
const MAX_NAME_LENGTH = 32;
const INFO_TRACK_LIMIT = 20;

module.exports = {
  name: "playlist",
  aliases: ["pl"],
  category: "Playlist",
  cooldown: 3,
  description: "Create, save, manage, and load your own playlists.",
  args: false,
  usage: "create|add|load|list|info|remove|delete",
  userPrams: [],
  botPrams: ["EmbedLinks"],
  owner: false,
  player: false,
  inVoiceChannel: false,
  sameVoiceChannel: false,
  execute: async (message, args, client, prefix) => {
    const subcommand = (args.shift() || "help").toLowerCase();

    try {
      if (["help", "h"].includes(subcommand)) {
        return sendHelp(message, client, prefix);
      }

      if (["create", "new", "make"].includes(subcommand)) {
        return createPlaylist(message, args, client);
      }

      if (["list", "ls"].includes(subcommand)) {
        return listPlaylists(message, client);
      }

      if (["add", "save"].includes(subcommand)) {
        return addTrack(message, args, client);
      }

      if (["load", "play"].includes(subcommand)) {
        return loadPlaylist(message, args, client);
      }

      if (["info", "show"].includes(subcommand)) {
        return showPlaylist(message, args, client);
      }

      if (["remove", "rm", "delete-track", "deltrack"].includes(subcommand)) {
        return removeTrack(message, args, client);
      }

      if (["delete", "del"].includes(subcommand)) {
        return deletePlaylist(message, args, client);
      }

      if (["rename", "ren"].includes(subcommand)) {
        return renamePlaylist(message, args, client);
      }

      return sendHelp(message, client, prefix);
    } catch (error) {
      console.error("Playlist command error:", error);
      return sendEmbed(
        message,
        client,
        `${fail(client)} Something went wrong while handling that playlist.`,
      );
    }
  },
};

async function createPlaylist(message, args, client) {
  const name = getName(args[0]);
  const error = validateName(name);

  if (error) {
    return sendEmbed(message, client, `${fail(client)} ${error}`);
  }

  const existing = await findPlaylist(message.author.id, name);
  if (existing) {
    return sendEmbed(
      message,
      client,
      `${fail(client)} You already have a playlist named **${name}**.`,
    );
  }

  const total = await Playlist.countDocuments({ UserId: message.author.id });
  if (total >= MAX_PLAYLISTS) {
    return sendEmbed(
      message,
      client,
      `${fail(client)} You can only create **${MAX_PLAYLISTS}** playlists.`,
    );
  }

  await Playlist.create({
    Username: message.author.tag,
    UserId: message.author.id,
    PlaylistName: name,
    Playlist: [],
    CreatedOn: Math.round(Date.now() / 1000),
  });

  return sendEmbed(
    message,
    client,
    `${ok(client)} Created playlist **${name}**.`,
  );
}

async function listPlaylists(message, client) {
  const playlists = await Playlist.find({ UserId: message.author.id }).sort({
    CreatedOn: -1,
  });

  if (!playlists.length) {
    return sendEmbed(
      message,
      client,
      `${fail(client)} You do not have any playlists yet.`,
    );
  }

  const lines = playlists
    .slice(0, MAX_PLAYLISTS)
    .map((playlist, index) => {
      const tracks = Array.isArray(playlist.Playlist)
        ? playlist.Playlist.length
        : 0;
      return `\`${index + 1}.\` **${playlist.PlaylistName}** - ${tracks} track(s)`;
    });

  return message.reply(v2({
    embeds: [
      baseEmbed(client)
        .setAuthor({
          name: `${message.author.username}'s playlists`,
          iconURL: message.author.displayAvatarURL(),
        })
        .setDescription(lines.join("\n")),
    ],
  }));
}

async function addTrack(message, args, client) {
  const name = getName(args.shift());
  const error = validateName(name);

  if (error) {
    return sendEmbed(message, client, `${fail(client)} ${error}`);
  }

  const playlist = await findPlaylist(message.author.id, name);
  if (!playlist) {
    return sendEmbed(
      message,
      client,
      `${fail(client)} You do not have a playlist named **${name}**.`,
    );
  }

  ensureTrackArray(playlist);

  if (playlist.Playlist.length >= MAX_TRACKS) {
    return sendEmbed(
      message,
      client,
      `${fail(client)} **${playlist.PlaylistName}** already has **${MAX_TRACKS}** tracks.`,
    );
  }

  const query = args.join(" ").trim();
  const tracks = query
    ? await searchTracks(client, message, query)
    : getCurrentTrack(client, message);

  if (!tracks.length) {
    return sendEmbed(
      message,
      client,
      `${fail(client)} Give me a song name/URL, or play a song first and run this again.`,
    );
  }

  let added = 0;
  let skipped = 0;

  for (const track of tracks) {
    if (playlist.Playlist.length >= MAX_TRACKS) break;

    const savedTrack = toSavedTrack(track);
    if (!savedTrack.title || !savedTrack.uri) {
      skipped += 1;
      continue;
    }

    const duplicate = playlist.Playlist.some(
      (item) => item.uri && item.uri === savedTrack.uri,
    );

    if (duplicate) {
      skipped += 1;
      continue;
    }

    playlist.Playlist.push(savedTrack);
    added += 1;
  }

  if (!added) {
    return sendEmbed(
      message,
      client,
      `${fail(client)} That track is already saved in **${playlist.PlaylistName}**.`,
    );
  }

  await playlist.save();

  const skippedText = skipped ? ` (${skipped} skipped)` : "";
  return sendEmbed(
    message,
    client,
    `${ok(client)} Added **${added}** track(s) to **${playlist.PlaylistName}**${skippedText}.`,
  );
}

async function loadPlaylist(message, args, client) {
  const name = getName(args[0]);
  const error = validateName(name);

  if (error) {
    return sendEmbed(message, client, `${fail(client)} ${error}`);
  }

  const voiceError = getVoiceError(message, client);
  if (voiceError) {
    return sendEmbed(message, client, `${fail(client)} ${voiceError}`);
  }

  const playlist = await findPlaylist(message.author.id, name);
  if (!playlist) {
    return sendEmbed(
      message,
      client,
      `${fail(client)} You do not have a playlist named **${name}**.`,
    );
  }

  ensureTrackArray(playlist);

  if (!playlist.Playlist.length) {
    return sendEmbed(
      message,
      client,
      `${fail(client)} **${playlist.PlaylistName}** is empty.`,
    );
  }

  const player = await client.manager
    .createPlayer({
      guildId: message.guild.id,
      voiceId: message.member.voice.channel.id,
      textId: message.channel.id,
      volume: 80,
      deaf: true,
    })
    .catch((error) => {
      client.logger?.log(
        `[Music] Failed to create player: ${error.stack || error}`,
        "error",
      );
      return null;
    });

  if (!player) {
    return sendEmbed(
      message,
      client,
      `${fail(client)} I could not connect to the voice channel. Check the Lavalink node and my voice permissions.`,
    );
  }

  const loadingMessage = await message.reply(v2({
    embeds: [
      baseEmbed(client).setDescription(
        `${ok(client)} Loading **${playlist.PlaylistName}**...`,
      ),
    ],
  }));

  let added = 0;

  for (const savedTrack of playlist.Playlist) {
    const query = savedTrack.uri || savedTrack.title;
    if (!query) continue;

    const result = await player
      .search(query, { requester: message.author })
      .catch(() => null);
    const track = result?.tracks?.[0];
    if (!track) continue;

    player.queue.add(track);
    added += 1;
  }

  if (!added) {
    if (!player.queue.current) player.destroy();
    return loadingMessage.edit(v2({
      embeds: [
        baseEmbed(client).setDescription(
          `${fail(client)} I could not load any tracks from **${playlist.PlaylistName}**.`,
        ),
      ],
    }));
  }

  if (!player.playing && !player.paused) {
    const started = await startPlayback(client, player);
    if (!started) {
      return loadingMessage.edit(v2({
        embeds: [
          baseEmbed(client).setDescription(
            `${fail(client)} I could not start playback. Check the Lavalink node and try again.`,
          ),
        ],
      }));
    }
  }

  return loadingMessage.edit(v2({
    embeds: [
      baseEmbed(client).setDescription(
        `${ok(client)} Loaded **${added}** track(s) from **${playlist.PlaylistName}**.`,
      ),
    ],
  }));
}

async function showPlaylist(message, args, client) {
  const name = getName(args[0]);
  const error = validateName(name);

  if (error) {
    return sendEmbed(message, client, `${fail(client)} ${error}`);
  }

  const playlist = await findPlaylist(message.author.id, name);
  if (!playlist) {
    return sendEmbed(
      message,
      client,
      `${fail(client)} You do not have a playlist named **${name}**.`,
    );
  }

  ensureTrackArray(playlist);

  const tracks = playlist.Playlist.slice(0, INFO_TRACK_LIMIT).map(
    (track, index) => `\`${index + 1}.\` ${formatTrack(track)}`,
  );

  const extra =
    playlist.Playlist.length > INFO_TRACK_LIMIT
      ? `\n...and ${playlist.Playlist.length - INFO_TRACK_LIMIT} more.`
      : "";

  return message.reply(v2({
    embeds: [
      baseEmbed(client)
        .setTitle(playlist.PlaylistName)
        .setDescription(
          tracks.length
            ? `${tracks.join("\n")}${extra}`
            : "No tracks saved yet.",
        )
        .setFooter({ text: `${playlist.Playlist.length} track(s)` }),
    ],
  }));
}

async function removeTrack(message, args, client) {
  const name = getName(args.shift());
  const error = validateName(name);

  if (error) {
    return sendEmbed(message, client, `${fail(client)} ${error}`);
  }

  const index = Number(args[0]) - 1;
  if (!Number.isInteger(index)) {
    return sendEmbed(
      message,
      client,
      `${fail(client)} Give the track number from \`playlist info ${name}\`.`,
    );
  }

  const playlist = await findPlaylist(message.author.id, name);
  if (!playlist) {
    return sendEmbed(
      message,
      client,
      `${fail(client)} You do not have a playlist named **${name}**.`,
    );
  }

  ensureTrackArray(playlist);

  if (index < 0 || index >= playlist.Playlist.length) {
    return sendEmbed(
      message,
      client,
      `${fail(client)} Track number must be between **1** and **${playlist.Playlist.length}**.`,
    );
  }

  const [removed] = playlist.Playlist.splice(index, 1);
  await playlist.save();

  return sendEmbed(
    message,
    client,
    `${ok(client)} Removed **${cleanText(removed.title)}** from **${playlist.PlaylistName}**.`,
  );
}

async function deletePlaylist(message, args, client) {
  const name = getName(args[0]);
  const error = validateName(name);

  if (error) {
    return sendEmbed(message, client, `${fail(client)} ${error}`);
  }

  const playlist = await findPlaylist(message.author.id, name);
  if (!playlist) {
    return sendEmbed(
      message,
      client,
      `${fail(client)} You do not have a playlist named **${name}**.`,
    );
  }

  await playlist.deleteOne();
  return sendEmbed(
    message,
    client,
    `${ok(client)} Deleted playlist **${playlist.PlaylistName}**.`,
  );
}

async function renamePlaylist(message, args, client) {
  const oldName = getName(args.shift());
  const newName = getName(args[0]);
  const oldNameError = validateName(oldName);
  const newNameError = validateName(newName);

  if (oldNameError || newNameError) {
    return sendEmbed(
      message,
      client,
      `${fail(client)} Use \`playlist rename old_name new_name\`. Names can use letters, numbers, dash, and underscore only.`,
    );
  }

  const playlist = await findPlaylist(message.author.id, oldName);
  if (!playlist) {
    return sendEmbed(
      message,
      client,
      `${fail(client)} You do not have a playlist named **${oldName}**.`,
    );
  }

  const duplicate = await findPlaylist(message.author.id, newName);
  if (duplicate) {
    return sendEmbed(
      message,
      client,
      `${fail(client)} You already have a playlist named **${newName}**.`,
    );
  }

  playlist.PlaylistName = newName;
  await playlist.save();

  return sendEmbed(
    message,
    client,
    `${ok(client)} Renamed **${oldName}** to **${newName}**.`,
  );
}

function sendHelp(message, client, prefix) {
  const lines = [
    `\`${prefix}playlist create chill\``,
    `\`${prefix}playlist add chill song name or url\``,
    `\`${prefix}playlist add chill\` - saves the current song`,
    `\`${prefix}playlist load chill\``,
    `\`${prefix}playlist list\``,
    `\`${prefix}playlist info chill\``,
    `\`${prefix}playlist remove chill 2\``,
    `\`${prefix}playlist delete chill\``,
  ];

  return message.reply(v2({
    embeds: [
      baseEmbed(client)
        .setTitle("Playlist")
        .setDescription(lines.join("\n"))
        .setFooter({ text: "Use one-word playlist names like chill or sad_songs." }),
    ],
  }));
}

async function searchTracks(client, message, query) {
  const result = await client.manager
    .search(query, { requester: message.author })
    .catch(() => null);

  if (!result?.tracks?.length) return [];
  if (result.type === "PLAYLIST") return result.tracks;
  return [result.tracks[0]];
}

function getCurrentTrack(client, message) {
  const player = client.manager.players.get(message.guild.id);
  return player?.queue?.current ? [player.queue.current] : [];
}

function getVoiceError(message, client) {
  const voiceChannel = message.member.voice.channel;
  if (!voiceChannel) return "Join a voice channel first.";

  const botChannel = message.guild.members.me.voice.channel;
  if (botChannel && botChannel.id !== voiceChannel.id) {
    return "You need to be in my voice channel.";
  }

  const permissions = voiceChannel.permissionsFor(message.guild.members.me);
  if (
    !permissions?.has(
      PermissionsBitField.resolve(["Connect", "Speak"]),
      true,
    )
  ) {
    return "I need Connect and Speak permissions in your voice channel.";
  }

  return null;
}

function toSavedTrack(track) {
  return {
    title: String(track.title || "Unknown title").slice(0, 150),
    uri: track.uri || track.url || track.realUri,
    author: track.author || "Unknown artist",
    duration: Number(track.length || track.duration || 0),
  };
}

function formatTrack(track) {
  const title = cleanText(track.title || "Unknown title").slice(0, 70);
  const duration = Number(track.duration || track.length || 0);
  const time =
    Number.isFinite(duration) && duration > 0
      ? ` - \`${convertTime(duration)}\``
      : "";

  if (track.uri) return `[${title}](${track.uri})${time}`;
  return `${title}${time}`;
}

function sendEmbed(message, client, description) {
  return message.reply(v2({
    embeds: [baseEmbed(client).setDescription(description)],
  }));
}

function baseEmbed(client) {
  return new EmbedBuilder();
}

function ok(client) {
  return client.emoji?.tick || "Done:";
}

function fail(client) {
  return client.emoji?.cross || "Error:";
}

function getName(value) {
  return String(value || "").trim();
}

function validateName(name) {
  if (!name) return "Give a playlist name.";
  if (name.length > MAX_NAME_LENGTH) {
    return `Playlist name cannot be longer than **${MAX_NAME_LENGTH}** characters.`;
  }
  if (!/^[A-Za-z0-9_-]+$/.test(name)) {
    return "Use letters, numbers, dash, and underscore only for playlist names.";
  }
  return null;
}

async function findPlaylist(userId, name) {
  return Playlist.findOne({
    UserId: userId,
    PlaylistName: { $regex: new RegExp(`^${escapeRegExp(name)}$`, "i") },
  });
}

function ensureTrackArray(playlist) {
  if (!Array.isArray(playlist.Playlist)) playlist.Playlist = [];
}

function cleanText(value) {
  return String(value || "Unknown").replace(/[`*_~|[\]()]/g, "");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
