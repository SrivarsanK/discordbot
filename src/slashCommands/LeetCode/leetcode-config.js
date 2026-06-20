/** @format */

const { EmbedBuilder, ApplicationCommandOptionType } = require("discord.js");
const { v2 } = require("../../utils/v2");
const LeetcodeServerConfig = require("../../schema/leetcodeServerConfig");

module.exports = {
  name: "leetcode-config",
  description: "Configure LeetCode difficulty points and shoutout channel (Admin only)",
  userPrams: ["ManageGuild"],
  options: [
    {
      name: "easy_points",
      description: "Points to award for Easy problems",
      type: ApplicationCommandOptionType.Integer,
      required: false,
    },
    {
      name: "medium_points",
      description: "Points to award for Medium problems",
      type: ApplicationCommandOptionType.Integer,
      required: false,
    },
    {
      name: "hard_points",
      description: "Points to award for Hard problems",
      type: ApplicationCommandOptionType.Integer,
      required: false,
    },
    {
      name: "shoutout_channel",
      description: "The channel where solver shoutouts will be posted",
      type: ApplicationCommandOptionType.Channel,
      required: false,
    }
  ],

  run: async (client, interaction) => {
    await interaction.deferReply();
    const guildId = interaction.guildId;

    // Fetch existing config
    let config = await LeetcodeServerConfig.findOne({ guildId });
    if (!config) {
      config = await LeetcodeServerConfig.create({ guildId });
    }

    const easy = interaction.options.getInteger("easy_points");
    const medium = interaction.options.getInteger("medium_points");
    const hard = interaction.options.getInteger("hard_points");
    const channel = interaction.options.getChannel("shoutout_channel");

    // If no options are specified, show current configuration
    if (easy === null && medium === null && hard === null && channel === null) {
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

      return interaction.editReply(v2({ embeds: [embed] }));
    }

    // Apply updates
    if (easy !== null) {
      if (easy < 0) return interaction.editReply(v2("❌ Points cannot be negative."));
      config.pointsEasy = easy;
    }
    if (medium !== null) {
      if (medium < 0) return interaction.editReply(v2("❌ Points cannot be negative."));
      config.pointsMedium = medium;
    }
    if (hard !== null) {
      if (hard < 0) return interaction.editReply(v2("❌ Points cannot be negative."));
      config.pointsHard = hard;
    }
    if (channel !== null) {
      config.shoutoutChannelId = channel.id;
    }

    await config.save();

    const successEmbed = new EmbedBuilder()
      .setTitle("✅ Configuration Updated!")
      .addFields(
        { name: "🟢 Easy Points", value: `**${config.pointsEasy}** points`, inline: true },
        { name: "🟡 Medium Points", value: `**${config.pointsMedium}** points`, inline: true },
        { name: "🔴 Hard Points", value: `**${config.pointsHard}** points`, inline: true },
        { name: "📢 Shoutout Channel", value: config.shoutoutChannelId ? `<#${config.shoutoutChannelId}>` : "*None (Default to question post channel)*", inline: false }
      )
      .setColor("#57F287");

    interaction.editReply(v2({ embeds: [successEmbed] }));
  },
};
