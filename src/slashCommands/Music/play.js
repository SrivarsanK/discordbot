const { v2 } = require("../../utils/v2");
const {
  CommandInteraction,
  Client,
  EmbedBuilder,
  MessageFlags,
  PermissionsBitField,
} = require("discord.js");
const { convertTime } = require("../../utils/convert.js");
const { startPlayback } = require("../../utils/playback");

module.exports = {
  name: "play",
  description: "To play some song.",
  userPrams: [],
  botPrams: ["Connect", "Speak"],
  player: false,
  inVoiceChannel: true,
  sameVoiceChannel: true,
  options: [
    {
      name: "input",
      description: "The search input (name/url)",
      required: true,
      type: 3,
    },
  ],
  /**
   * @param {Client} client
   * @param {CommandInteraction} interaction
   */

  run: async (client, interaction) => {
    await interaction.deferReply({
      ephemeral: false,
    });

    const emojiaddsong = client.emoji.addsong;
    const emojiplaylist = client.emoji.playlist;
    const query = interaction.options.getString("input");

    const player = await client.manager
      .createPlayer({
        guildId: interaction.guildId,
        voiceId: interaction.member.voice.channelId,
        textId: interaction.channelId,
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
      return interaction.editReply(v2({
        content:
          "I could not connect to the voice channel. Check the Lavalink node and my voice permissions.",
      }));
    }
    const result = await player
      .search(query, { requester: interaction.user })
      .catch(() => null);
    if (!result?.tracks?.length) {
      if (!player.queue.current) player.destroy();
      return interaction.editReply(v2({ content: "No result was found" }));
    }
    const tracks = result.tracks;
    if (result.type === "PLAYLIST")
      for (const track of tracks) player.queue.add(track);
    else player.queue.add(tracks[0]);
    if (!player.playing && !player.paused) {
      const started = await startPlayback(client, player);
      if (!started) {
        return interaction.editReply(v2({
          content:
            "I could not start playback. Check the Lavalink node and try again.",
        }));
      }
    }
    return interaction.editReply(
      v2(result.type === "PLAYLIST"
        ? {
            embeds: [
              new EmbedBuilder()
                
                .setDescription(
                  `${emojiplaylist} Queued ${tracks.length} from ${result.playlistName}`,
                ),
            ],
          }
        : {
            embeds: [
              new EmbedBuilder()
                
                .setDescription(
                  `${emojiaddsong} Queued [${tracks[0].title}](${tracks[0].uri})`,
                ),
            ],
          }),
    );
  },
};
