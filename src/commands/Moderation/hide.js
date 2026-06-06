const { v2 } = require("../../utils/v2");

module.exports = {
  name: "hide",
  category: "Moderation",
  aliases: ["hidechannel", "hideall", "hidechannels"],
  cooldown: 3,
  description: "Hide a specific channel or all channels in the guild.",
  args: false,
  usage: "[#channel | all]",
  userPerms: ["ManageChannels"],
  botPerms: ["ManageChannels"],
  owner: false,
  execute: async (message, args, client, prefix) => {
    if (args[0] && args[0].toLowerCase() === "all") {
      let c = 0;
      message.guild.channels.cache.forEach((ch) => {
        ch.permissionOverwrites.edit(v2(message.guild.roles.everyone), {
          ViewChannel: false,
        });
        c++;
      });

      return message.channel.send(v2({
        embeds: [
          new client.embed()
            .d(`${client.emoji.tick} | Successfully **hid** ${c} channels.`),
        ],
      }));
    }

    const targetChannel =
      message.mentions.channels.first() ||
      message.guild.channels.cache.get(args[0]) ||
      message.channel;

    if (targetChannel.manageable) {
      targetChannel.permissionOverwrites.edit(v2(message.guild.roles.everyone), {
        ViewChannel: false,
        reason: `${message.author.tag} (${message.author.id})`,
      });

      return message.channel.send(v2({
        embeds: [
          new client.embed()
            .d(`${targetChannel} has been hidden for @everyone.`),
        ],
      }));
    } else {
      return message.channel.send(v2({
        embeds: [
          new client.embed()
            .d(`I don't have adequate permissions to hide this channel.`),
        ],
      }));
    }
  },
};
