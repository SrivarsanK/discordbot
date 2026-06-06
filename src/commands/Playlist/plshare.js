/** @format */

const { v2 } = require("../../utils/v2");

const {
  MessageFlags,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ComponentType,
  EmbedBuilder,
} = require("discord.js");
const db = require("../../schema/playlist");
const { clearComponents } = require("../../utils/componentCleanup");

module.exports = {
  name: "plshare",
  aliases: ["plshare", "pls"],
  category: "Playlist",
  cooldown: 3,
  description: "Share one of your playlists with a mentioned user.",
  args: true,
  usage: "[user]",
  userPrams: [],
  botPrams: ["EMBED_LINKS"],
  owner: false,
  execute: async (message, args, client, prefix) => {
    const giver = message.author;
    const userToShare = message.mentions.users.first();

    if (!userToShare) {
      return message.reply(v2({
        embeds: [
          new client.embed().d(
            "**Please mention a user to share your playlist with!**",
          ),
        ],
      }));
    }

    try {
      const userPlaylists = await db.find({ UserId: giver.id });

      if (!userPlaylists || userPlaylists.length === 0) {
        return message.reply(v2({
          embeds: [
            new client.embed().d("**You don't have any playlists to share!**"),
          ],
        }));
      }

      const playlistOptions = userPlaylists.map((playlist) => ({
        label: playlist.PlaylistName,
        value: playlist.PlaylistName,
        description: `${playlist.Playlist.length} song(s)`,
      }));

      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId("select-playlist")
        .setPlaceholder("Choose a playlist to share")
        .addOptions(playlistOptions);

      const actionRow = new ActionRowBuilder().addComponents(selectMenu);

      const messageWithMenu = await message.reply(v2({
        embeds: [
          new client.embed().d(
            "**Select a playlist to share from the dropdown below.**",
          ),
        ],
        components: [actionRow],
      }));

      const collector = messageWithMenu.createMessageComponentCollector({
        componentType: ComponentType.StringSelect,
        time: 60000,
      });

      collector.on("collect", async (interaction) => {
        if (interaction.user.id !== message.author.id) {
          return interaction.reply(v2({
            content: "You can't interact with this menu.",
            flags: MessageFlags.Ephemeral,
          }));
        }

        const selectedPlaylistName = interaction.values[0];
        const selectedPlaylist = userPlaylists.find(
          (playlist) => playlist.PlaylistName === selectedPlaylistName,
        );

        if (!selectedPlaylist) {
          return interaction.reply(v2({
            content: "The selected playlist could not be found.",
            flags: MessageFlags.Ephemeral,
          }));
        }

        const songs = selectedPlaylist.Playlist;

        if (!Array.isArray(songs) || songs.length === 0) {
          return interaction.reply(v2({
            content: `**The playlist "${selectedPlaylistName}" is empty! Add some songs first.**`,
            flags: MessageFlags.Ephemeral,
          }));
        }

        try {
          const recipientPlaylist = await db.findOne({
            UserId: userToShare.id,
            PlaylistName: selectedPlaylistName,
          });

          if (recipientPlaylist) {
            return interaction.reply(v2({
              content: `**${userToShare.tag} already has a playlist named "${selectedPlaylistName}". Sharing canceled to avoid duplicates.**`,
              flags: MessageFlags.Ephemeral,
            }));
          }

          const sharedSongs = songs.map((song) => ({
            title: song.title || "Unknown title",
            uri: song.uri || song.url || song.realUri,
            author: song.author || "Unknown artist",
            duration: Number(song.duration || song.length || 0),
          }));

          await db.create({
            Username: userToShare.tag,
            UserId: userToShare.id,
            PlaylistName: selectedPlaylistName,
            Playlist: sharedSongs,
            CreatedOn: Math.round(Date.now() / 1000),
          });

          const displayedSongs = sharedSongs
            .slice(0, 10)
            .map(
              (song, index) =>
                `**${index + 1}.** [${song.title}](${song.uri || "#"})`,
            )
            .join("\n");

          const playlistEmbed = new client.embed()
            .setTitle(`Playlist: ${selectedPlaylistName}`)
            .d(`**Total Songs:** ${songs.length}\n\n${displayedSongs}`)
            .setFooter({ text: `Shared by ${message.author.tag}` })
            .setTimestamp();

          await userToShare.send(v2({ embeds: [playlistEmbed] }));
          await interaction.update(v2({
            embeds: [
              new client.embed()
                
                .d(
                  `**Playlist "${selectedPlaylistName}" shared with ${userToShare.tag} and saved to their library!**`,
                ),
            ],
            components: [],
          }));
        } catch (error) {
          console.error(
            `Error saving playlist "${selectedPlaylistName}" for ${userToShare.tag}:`,
            error,
          );

          return interaction.reply(v2({
            content: `**An error occurred while saving the playlist to ${userToShare.tag}'s library. Please try again later.**`,
            flags: MessageFlags.Ephemeral,
          }));
        }
      });

      collector.on("end", (collected) => {
        if (collected.size === 0) {
          clearComponents(messageWithMenu);
        }
      });
    } catch (error) {
      console.error("Error fetching playlists:", error);
      return message.reply(v2({
        embeds: [
          new client.embed().d(
            "**An error occurred while fetching your playlists. Please try again later.**",
          ),
        ],
      }));
    }
  },
};
