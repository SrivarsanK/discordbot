const { v2 } = require("../../utils/v2");
const {
  EmbedBuilder,
  MessageFlags,
  CommandInteraction,
  Client,
  PermissionsBitField,
} = require("discord.js");

module.exports = {
  name: "join",
  description: "Join voice channel",
  userPrams: [],
  botPrams: ["EMBED_LINKS"],
  player: false,
  inVoiceChannel: true,
  sameVoiceChannel: true,
  /**
   *
   * @param {Client} client
   * @param {CommandInteraction} interaction
   */

  run: async (client, interaction) => {
    await interaction.deferReply({
      ephemeral: false,
    });
    const { channel } = interaction.member.voice;
    const player = client.manager.players.get(interaction.guild.id);
    if (player) {
      return await interaction.editReply(v2({
        embeds: [
          new EmbedBuilder()
            
            .setDescription(
              `I'm already connected to <#${player.voiceId}> voice channel!`,
            ),
        ],
      }));
    } else {
      if (
        !interaction.guild.members.me.permissions.has(
          PermissionsBitField.resolve(["Speak", "Connect"]),
        )
      )
        return interaction.editReply(v2({
          embeds: [
            new EmbedBuilder()
              
              .setDescription(
                `I don't have enough permissions to execute this command! please give me permission \`CONNECT\` or \`SPEAK\`.`,
              ),
          ],
        }));

      const emojiJoin = interaction.client.emoji.join;

      const created = await client.manager
        .createPlayer({
          guildId: interaction.guild.id,
          voiceId: interaction.member.voice.channel.id,
          textId: interaction.channel.id,
          deaf: true,
        })
        .catch((error) => {
          client.logger?.log(
            `[Music] Failed to create player: ${error.stack || error}`,
            "error",
          );
          return null;
        });

      if (!created) {
        return interaction.editReply(v2({
          content:
            "I could not connect to the voice channel. Check the Lavalink node and my voice permissions.",
        }));
      }

      const thing = new EmbedBuilder()
        
        .setDescription(
          `${emojiJoin} **Join the voice channel**\nJoined <#${channel.id}> and bound to <#${interaction.channel.id}>`,
        );
      return interaction.editReply(v2({ embeds: [thing] }));
    }
  },
};
