/** @format */

const { EmbedBuilder } = require("discord.js");
const { v2 } = require("../../utils/v2");
const LeetcodeServerConfig = require("../../schema/leetcodeServerConfig");

module.exports = {
  name: "leetcode-config",
  category: "LeetCode",
  aliases: ["lcconfig", "leetcodeconfig"],
  cooldown: 3,
  description: "Configure LeetCode difficulty points and shoutout channel (Admin only)",
  args: false,
  usage: "[easy_points] [medium_points] [hard_points] [#shoutout_channel]",
  userPerms: ["ManageGuild"],
  botPerms: [],
  owner: false,

  execute: async (message, args, client) => {
    const guildId = message.guild.id;

    // Fetch existing config
    let config = await LeetcodeServerConfig.findOne({ guildId });
    if (!config) {
      config = await LeetcodeServerConfig.create({ guildId });
    }

    if (args.length === 0) {
      // Show current config
      const channelMention = config.shoutoutChannelId ? `<#${config.shoutoutChannelId}>` : "*None (Default to question post channel)*";
      const embed = new EmbedBuilder()
        .setTitle("📊 LeetCode Server Configuration")
        .addFields(
          { name: "🟢 Easy Points", value: `**${config.pointsEasy}** points`, inline: true },
          { name: "🟡 Medium Points", value: `**${config.pointsMedium}** points`, inline: true },
          { name: "🔴 Hard Points", value: `**${config.pointsHard}** points`, inline: true },
          { name: "📢 Shoutout Channel", value: channelMention, inline: false }
        )
        .setColor(client.embedColor || "#5865F2");

      return message.channel.send(v2({ embeds: [embed] }));
    }

    // Parse arguments: easy, medium, hard, channel
    let easy = parseInt(args[0], 10);
    let medium = parseInt(args[1], 10);
    let hard = parseInt(args[2], 10);
    
    // Check if fourth argument is a channel mention/id or if the last argument is a channel
    let channelArg = args[3];
    let channelId = null;

    if (channelArg) {
      const match = channelArg.match(/^<#(\d+)>$/) || [null, channelArg];
      channelId = match[1];
    }

    // Validation
    if (isNaN(easy) || isNaN(medium) || isNaN(hard)) {
      return message.channel.send(v2({
        embeds: [
          new EmbedBuilder()
            .setDescription(`❌ Invalid format. Use: **\`${message.prefix || "!"}leetcode-config <easy_points> <medium_points> <hard_points> [#shoutout_channel]\`**`)
            .setColor("#ED4245")
        ]
      }));
    }

    if (easy < 0 || medium < 0 || hard < 0) {
      return message.channel.send(v2({
        embeds: [
          new EmbedBuilder()
            .setDescription("❌ Points cannot be negative values.")
            .setColor("#ED4245")
        ]
      }));
    }

    // Update config
    config.pointsEasy = easy;
    config.pointsMedium = medium;
    config.pointsHard = hard;
    if (channelId !== null) {
      // Validate channel exists in guild
      const channel = message.guild.channels.cache.get(channelId) || 
                      await message.guild.channels.fetch(channelId).catch(() => null);
      if (!channel) {
        return message.channel.send(v2({
          embeds: [
            new EmbedBuilder()
              .setDescription("❌ Could not resolve the specified shoutout channel.")
              .setColor("#ED4245")
          ]
        }));
      }
      config.shoutoutChannelId = channelId;
    }

    await config.save();

    const successEmbed = new EmbedBuilder()
      .setTitle("✅ Configuration Updated!")
      .addFields(
        { name: "🟢 Easy Points", value: `**${easy}** points`, inline: true },
        { name: "🟡 Medium Points", value: `**${medium}** points`, inline: true },
        { name: "🔴 Hard Points", value: `**${hard}** points`, inline: true },
        { name: "📢 Shoutout Channel", value: config.shoutoutChannelId ? `<#${config.shoutoutChannelId}>` : "*None (Default to question post channel)*", inline: false }
      )
      .setColor("#57F287");

    message.channel.send(v2({ embeds: [successEmbed] }));
  },
};
