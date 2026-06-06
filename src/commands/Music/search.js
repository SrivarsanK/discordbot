const { v2 } = require("../../utils/v2");
const { startPlayback } = require("../../utils/playback");
const {
  EmbedBuilder,
  MessageFlags,
  ActionRowBuilder,
  StringSelectMenuBuilder,
} = require("discord.js");
const { convertTime } = require("../../utils/convert");

module.exports = {
  name: "search",
  description: "Search for a song on YouTube.",
  category: "Music",
  aliases: ["sr"],
  cooldown: 3,
  usage: [`<song>`],
  args: true,
  userPrems: [],
  owner: false,
  inVoiceChannel: true,
  sameVoiceChannel: true,
  execute: async (message, args, client, prefix) => {
    try {
      await message.channel.sendTyping();
      const query = args.join(" ");
      if (!query) {
        return message.channel.send(v2({
          embeds: [
            new EmbedBuilder()
              
              .setDescription(` **${prefix}search** \`<track name>\``),
          ],
        }));
      }

      if (
        /^(https?:\/\/)?(www\.)?(m\.)?(youtube\.com|youtu\.?be)\/.+$/gi.test(
          query,
        )
      ) {
        return message.channel.send(v2({
          embeds: [
            new EmbedBuilder()
              
              .setDescription(
                `We Have Removed Support Platform Of Youtube, please try using a different platform or provide a search query to use our default platform.`,
              ),
          ],
        }));
      }

      const { channel } = message.member.voice;
      const player = await client.manager
        .createPlayer({
          guildId: message.guild.id,
          voiceId: channel.id,
          textId: message.channel.id,
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
        return message.reply(
          v2("I could not connect to the voice channel. Check the Lavalink node and my voice permissions."),
        );
      }

      const result = await player.search(query, {
        requester: message.author,
      });

      if (!result.tracks.length) {
        return message.reply(v2(`No results found for \`${query}\``));
      }

      const tracks = result.tracks.slice(0, 10); // Limit to the top 10 results
      const options = tracks.map((track, index) => ({
        label: `${index + 1}. ${track.title.length > 15 ? track.title.slice(0, 15) + "..." : track.title}`,
        description: `Time: ${convertTime(track.length)} | Author: ${track.author}`,
        value: track.uri,
      }));

      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId("select-song")
        .setPlaceholder("❯ Select a song to play")
        .addOptions(options);

      const embed = new EmbedBuilder().setAuthor({
        name: `Select a song to play`,
        iconURL: message.author.displayAvatarURL({ dynamic: true }),
      });

      const msg = await message.channel.send(v2({
        embeds: [embed],
        components: [new ActionRowBuilder().addComponents(selectMenu)],
      }));

      const filter = (interaction) => interaction.user.id === message.author.id;
      const collector = message.channel.createMessageComponentCollector({
        filter,
        time: 60000, // 60 seconds
      });

      collector.on("collect", async (interaction) => {
        if (interaction.customId === "select-song") {
          const selectedTrackUri = interaction.values[0];

          // Check if the song already exists in the queue
          const existingTrack = player.queue?.tracks?.find(
            (track) => track.uri === selectedTrackUri,
          );

          if (existingTrack) {
            return interaction.reply(v2({
              content: "This song is already in the queue!",
              flags: MessageFlags.Ephemeral,
            }));
          }

          // Fetch and add the selected track
          const selectedTrack = await player
            .search(selectedTrackUri, {
              requester: interaction.user,
            })
            .then((x) => x.tracks[0]);

          if (!selectedTrack) {
            return interaction.reply(v2({
              content: "An error occurred while adding the song.",
              flags: MessageFlags.Ephemeral,
            }));
          }

          player.queue.add(selectedTrack);

          if (!player.playing && !player.paused) {
            const started = await startPlayback(client, player);
            if (!started) {
              return interaction.reply(v2({
                content:
                  "I could not start playback. Check the Lavalink node and try again.",
                flags: MessageFlags.Ephemeral,
              }));
            }
          }

          interaction.update(v2({
            embeds: [
              embed
                .setAuthor({
                  name: `Added to queue`,
                  iconURL: message.author.displayAvatarURL({ dynamic: true }),
                })
                .setDescription(
                  `**[${selectedTrack.title}](${selectedTrack.uri})**`,
                ),
            ],
            components: [],
          }));
        }
      });

      collector.on("end", (collected) => {
        if (collected.size === 0) {
          msg.edit(v2({
            embeds: [
              embed
                .setAuthor({
                  name: `Selection Timed Out`,
                  iconURL: message.author.displayAvatarURL({ dynamic: true }),
                })
                .setDescription(`**No song was selected.**`),
            ],
            components: [],
          }));
        }
      });
    } catch (error) {
      console.error("Error in search command:", error);
      message.channel.send(v2({
        embeds: [
          new EmbedBuilder()
            
            .setDescription("An error occurred while executing the command."),
        ],
      }));
    }
  },
};
