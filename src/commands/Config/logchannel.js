const { v2 } = require("../../utils/v2");
const { EmbedBuilder, ChannelType, PermissionsBitField } = require("discord.js");
const AntiNuke = require("../../schema/antinuke");

module.exports = {
  name: "logchannel",
  category: "Config",
  description: "Sets or displays the server logging channel for antinuke and security events.",
  args: false,
  usage: "[#channel | channel_id | disable]",
  aliases: ["setlog", "log"],
  botPerms: ["EmbedLinks"],
  userPerms: ["ManageGuild"],
  owner: false,
  cooldown: 3,
  execute: async (message, args, client, prefix) => {
    let antinukeConfig = await AntiNuke.findOne({ guildId: message.guild.id });
    if (!antinukeConfig) {
      antinukeConfig = new AntiNuke({ guildId: message.guild.id });
      await antinukeConfig.save();
    }

    const value = args[0];
    if (!value) {
      const currentLogChannel = antinukeConfig.logChannelId
        ? `<#${antinukeConfig.logChannelId}>`
        : "None (Disabled)";
      const embed = new EmbedBuilder()
        .setTitle("Security Logging Channel")
        .setDescription(`Current log channel: ${currentLogChannel}\n\nTo set a new log channel, use: \`${prefix}logchannel <#channel | channel_id>\`\nTo disable, use: \`${prefix}logchannel disable\``);
      return message.reply(v2({ embeds: [embed] }));
    }

    if (value.toLowerCase() === "disable") {
      antinukeConfig.logChannelId = null;
      await antinukeConfig.save();
      const embed = new EmbedBuilder()
        .setDescription(`✅ | Successfully disabled security logging.`);
      return message.reply(v2({ embeds: [embed] }));
    }

    const channel =
      message.mentions.channels.first() ||
      message.guild.channels.cache.get(value);

    if (!channel || channel.type !== ChannelType.GuildText) {
      return message.reply(v2("⚠️ Please provide a valid text channel."));
    }

    antinukeConfig.logChannelId = channel.id;
    await antinukeConfig.save();

    const embed = new EmbedBuilder()
      .setDescription(`✅ | Successfully set security logging channel to ${channel.toString()}`);
    return message.reply(v2({ embeds: [embed] }));
  },
};
