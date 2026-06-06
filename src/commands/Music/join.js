const { v2 } = require("../../utils/v2");
const {
  EmbedBuilder,
  MessageFlags,
  PermissionsBitField,
} = require("discord.js");

module.exports = {
  name: "join",
  aliases: ["j"],
  category: "Music",
  cooldown: 3,
  description: "Join voice channel",
  args: false,
  usage: "",
  userPrams: [],
  botPrams: ["EMBED_LINKS"],
  owner: false,
  player: false,
  inVoiceChannel: true,
  sameVoiceChannel: false,
  execute: async (message, args, client, prefix) => {
    const { channel } = message.member.voice;
    const player = client.manager.players.get(message.guild.id);
    if (player) {
      return await message.channel.send(v2({
        embeds: [
          new EmbedBuilder()
            
            .setDescription(
              `${client.emoji.cross} | I'm already connected to <#${player.voiceId}> voice channel!`,
            ),
        ],
      }));
    } else {
      if (
        !message.guild.members.me.permissions.has(
          PermissionsBitField.resolve(["Speak", "Connect"]),
        )
      )
        return message.channel.send(v2({
          embeds: [
            new EmbedBuilder()
              
              .setDescription(
                `${client.emoji.cross} | I don't have enough permissions to execute this command! please give me permission \`CONNECT\` or \`SPEAK\`.`,
              ),
          ],
        }));

      if (
        !message.guild.members.me.permissions.has(
          PermissionsBitField.resolve(["Speak", "Connect"]),
        )
      )
        return message.channel.send(v2({
          embeds: [
            new EmbedBuilder()
              
              .setDescription(
                `${client.emoji.cross} | I don't have enough permissions connect your vc please give me permission \`CONNECT\` or \`SPEAK\`.`,
              ),
          ],
        }));

      const created = await client.manager
        .createPlayer({
          guildId: message.guild.id,
          voiceId: message.member.voice.channel.id,
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

      if (!created) {
        return message.reply(v2({
          content:
            "I could not connect to the voice channel. Check the Lavalink node and my voice permissions.",
        }));
      }

      const thing = new EmbedBuilder()
        
        .setDescription(
          `${client.emoji.join} Joined <#${channel.id}> and bound to <#${message.channel.id}>`,
        );
      return message.reply(v2({ embeds: [thing] }));
    }
  },
};
