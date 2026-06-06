const { v2 } = require("../../utils/v2");
const { EmbedBuilder, MessageFlags, ChannelType } = require("discord.js");

module.exports = {
  name: "vcmoveall",
  category: "Voice",
  aliases: ["voicemoveall"],
  description:
    "Move all members from the user's voice channel to a specified voice channel.",
  args: true,
  usage: "<channel_mention_or_id>",
  userPerms: ["MoveMembers"], // Permission required to move members
  owner: false,
  execute: async (message, args, client, prefix) => {
    const voiceChannel = message.member.voice.channel;

    if (!voiceChannel) {
      return message.channel.send(v2({
        embeds: [
          new client.embed().d(
            `<@${message.author.id}>, please join a voice channel first.`,
          ),
        ],
      }));
    }

    const targetChannelId = args[0].replace(/[<#>]/g, ""); // Extract the channel ID
    const targetChannel = message.guild.channels.cache.get(targetChannelId);

    if (!targetChannel || targetChannel.type !== ChannelType.GuildVoice) {
      return message.channel.send(v2({
        embeds: [
          new client.embed().d(
            `Invalid channel. Please mention or provide the ID of a valid voice channel.`,
          ),
        ],
      }));
    }

    try {
      // Move all members
      let membersMoved = 0;
      for (const [memberId, member] of voiceChannel.members) {
        await member.voice.setChannel(targetChannel);
        membersMoved++;
      }

      message.channel.send(v2({
        embeds: [
          new client.embed().d(
            `Successfully moved ${membersMoved} members from **${voiceChannel.name}** to **${targetChannel.name}**.`,
          ),
        ],
      }));
    } catch (err) {
      console.error(err);
      message.channel.send(v2({
        embeds: [
          new client.embed().d(
            `An error occurred while moving members. Please try again later.`,
          ),
        ],
      }));
    }
  },
};
