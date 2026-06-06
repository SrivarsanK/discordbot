const { v2 } = require("../../utils/v2");
const { CommandInteraction, Client, EmbedBuilder } = require("discord.js");
const { convertTime } = require("../../utils/convert.js");
const { trackLink } = require("../../utils/botMeta");

module.exports = {
  name: "queue",
  description: "To see the whole server queue.",
  userPrams: [],
  botPrams: ["EMBED_LINKS"],
  player: true,
  inVoiceChannel: false,
  sameVoiceChannel: false,
  options: [
    {
      name: "page",
      type: 10,
      required: false,
      description: "The queue page number.",
    },
  ],

  /**
   * @param {Client} client
   * @param {CommandInteraction} interaction
   */
  run: async (client, interaction) => {
    await interaction.deferReply().catch(() => {});

    const player = client.manager.players.get(interaction.guildId);
    if (!player || !player.queue.current) {
      return interaction.editReply(v2({ content: "Nothing is playing right now." })).catch(() => {});
    }

    const currentTrack = player.queue.current;
    const page = Math.max(1, interaction.options.getNumber("page") || 1);
    const start = (page - 1) * 10;
    const tracks = player.queue.slice(start, start + 10);
    const queueLines = tracks.map((track, index) => {
      const duration = track.isStream ? "LIVE" : convertTime(track.length);
      return `\`${start + index + 1}.\` ${trackLink(track)} - \`${duration}\``;
    });

    const currentDuration = currentTrack.isStream
      ? "LIVE"
      : convertTime(currentTrack.length);

    const embed = new EmbedBuilder()
      
      .setTitle(`${interaction.guild.name} Queue`)
      .setDescription(
        `**Now Playing**\n${trackLink(currentTrack)} - \`${currentDuration}\`\n\n` +
          `**Queued Songs**\n${queueLines.join("\n") || "No songs queued."}`,
      )
      .setFooter({
        text: `Modified by SrivarsanK | Page ${page}`,
        iconURL: interaction.user.displayAvatarURL({ dynamic: true }),
      });

    return interaction.editReply(v2({ embeds: [embed] })).catch(() => {});
  },
};
