const { v2 } = require("../../utils/v2");
const {
  EmbedBuilder,
  PermissionsBitField,
} = require("discord.js");
const IgnoreChannelModel = require("../../schema/ignorechannel");

module.exports = {
  name: "ignore",
  aliases: ["ig"],
  category: "Config",
  voteonly: true,
  description: "Ignorechannel",
  usage: "",
  userPerms: [],
  args: false,
  cooldown: 3,
  execute: async (message, args, client, prefix) => {
    if (
      !message.member.permissions.has(
        PermissionsBitField.resolve("ManageChannels"),
      )
    ) {
      return message.reply(v2({
        embeds: [
          new EmbedBuilder()
            .setDescription(
              `${client.emoji.cross} | You must have \`Manage Channels\` permissions to use this command.`,
            ),
        ],
      }));
    }

    if (!args[0]) {
      const embed = new EmbedBuilder()
        .setThumbnail(client.user.displayAvatarURL())
        .setDescription(
          ` \`\`\`[] = Optional Argument\n<> = Required Argument\nDo NOT type these when using commands!\`\`\`\n\n**Aliases:**\n\`\`[ignore]\`\`\n**Usage:**\n\`\`add/remove/config/reset\`\``,
        )
        .setFooter({
          text: `Req By ` + message.author.displayName,
          iconURL: message.author.displayAvatarURL({ dynamic: true }),
        });
      return message.channel.send(v2({ embeds: [embed] }));
    }

    const guildId = message.guild.id;

    // Helper: load the guild's channels array from the single-row schema
    async function loadChannels() {
      const doc = await IgnoreChannelModel.findOne({ guildId }).lean();
      return Array.isArray(doc?.channels) ? doc.channels : [];
    }

    // Helper: save updated channels array back to the single-row schema
    async function saveChannels(channels) {
      await IgnoreChannelModel.findOneAndUpdate(
        { guildId },
        { guildId, channels },
        { upsert: true, new: true },
      );
    }

    const option = args[0].toLowerCase();

    if (option === "add") {
      const channel =
        message.mentions.channels.first() ||
        message.guild.channels.cache.get(args[1]);
      if (!channel)
        return message.channel.send(v2({ content: `Please provide a valid channel.` }));

      const channels = await loadChannels();
      if (channels.includes(channel.id))
        return message.channel.send(v2({ content: `This channel is already in the ignore channel list.` }));

      channels.push(channel.id);
      await saveChannels(channels);
      return message.channel.send(v2({ content: `Successfully added ${channel} to the ignore channel list.` }));

    } else if (option === "remove") {
      const channel =
        message.mentions.channels.first() ||
        message.guild.channels.cache.get(args[1]);
      if (!channel)
        return message.channel.send(v2({ content: `Please provide a valid channel.` }));

      const channels = await loadChannels();
      if (!channels.includes(channel.id))
        return message.channel.send(v2({ content: `This channel is not in the ignore channel list.` }));

      await saveChannels(channels.filter((id) => id !== channel.id));
      return message.channel.send(v2({ content: `Successfully removed ${channel} from the ignore channel list.` }));

    } else if (option === "config") {
      const channels = await loadChannels();
      if (!channels.length)
        return message.channel.send(v2({ content: `There are no channels in the ignore channel list.` }));

      const list = channels.map((id, i) => `> ${i + 1} <#${id}>`).join("\n");
      const embed = new EmbedBuilder()
        .setTitle("The following channels are in the ignore channel list:-")
        .setDescription(list);
      return message.channel.send(v2({ embeds: [embed] }));

    } else if (option === "reset") {
      const channels = await loadChannels();
      if (!channels.length)
        return message.channel.send(v2({ content: `There are no channels in the ignore channel list.` }));

      await saveChannels([]);
      return message.channel.send(v2({ content: `Successfully cleared the ignore channel list.` }));
    }
  },
};
