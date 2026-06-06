const { v2 } = require("../../utils/v2");
const {
  EmbedBuilder,
  MessageFlags,
  ButtonBuilder,
  ActionRowBuilder,
  ButtonStyle,
  ChannelType,
} = require("discord.js");

module.exports = {
  name: "vckickall",
  category: "Voice",
  aliases: ["voicekickall"],
  description: "",
  args: false,
  usage: "",
  userPerms: [],
  owner: false,
  execute: async (message, args, client, prefix) => {
    /**
     * @param {Bot} client
     * @param {Message} message
     * @param {String[]} args
     */

    const voicechannel = message.member.voice.channel;

    if (!voicechannel) {
      return message.channel.send(v2({
        embeds: [
          new EmbedBuilder()
            
            .setDescription(
              ` <@${message.author.id}> Please Join  Voice Channel`,
            ),
        ],
      }));
    }

    if (!message.guild.members.me.permissions.has("MoveMembers")) {
      return message.channel.send(v2({
        embeds: [
          new EmbedBuilder()
            .setDescription(`${client.emoji.cross} | I need the \`Move Members\` permission.`),
        ],
      }));
    }

    const members = voicechannel.members.filter((member) => member.id !== client.user.id);
    let kicked = 0;

    for (const member of members.values()) {
      await member.voice.disconnect().then(() => {
        kicked += 1;
      }).catch((error) => {
        client.logger?.log(
          `[Voice] Failed to disconnect ${member.id}: ${error.stack || error}`,
          "warn",
        );
      });
    }

    return message.channel.send(v2({
      embeds: [
        new EmbedBuilder()
          .setDescription(`${client.emoji.tick} | Disconnected **${kicked}** member(s) from **${voicechannel.name}**.`),
      ],
    }));
  },
};
