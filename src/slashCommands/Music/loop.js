const { v2 } = require("../../utils/v2");
const { CommandInteraction, Client, EmbedBuilder } = require("discord.js");

module.exports = {
  name: "loop",
  description: "Toggle music loop",
  userPrams: [],
  botPrams: ["EMBED_LINKS"],
  dj: true,
  player: true,
  inVoiceChannel: true,
  sameVoiceChannel: true,
  options: [
    {
      name: "input",
      description: "The looping input (track, queue or off).",
      type: 3,
      required: true,
      choices: [
        {
          name: "track",
          value: "track",
        },
        {
          name: "queue",
          value: "queue",
        },
        {
          name: "off",
          value: "off",
        },
      ],
    },
  ],

  run: async (client, interaction) => {
    if (!interaction.replied) await interaction.deferReply().catch(() => {});
    const player = client.manager.players.get(interaction.guild.id);

    const input = interaction.options.getString("input");
    const emojiloop = client.emoji.loop;

    if (input === "track") {
      await player.setLoop("track");
      return await interaction.editReply(v2({
        embeds: [
          new EmbedBuilder()
            
            .setDescription(`${emojiloop} Loop track is now **enable**`),
        ],
      }));
    } else if (input === "queue") {
      await player.setLoop("queue");
      return await interaction.editReply(v2({
        embeds: [
          new EmbedBuilder()
            
            .setDescription(`${emojiloop} Loop queue is now **enable**`),
        ],
      }));
    } else if (input === "off") {
      await player.setLoop("none");
      return await interaction.editReply(v2({
        embeds: [
          new EmbedBuilder()
            
            .setDescription(`${emojiloop} Loop is now **disabled**`),
        ],
      }));
    }
  },
};
