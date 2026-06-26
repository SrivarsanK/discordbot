/** @format */
const { EmbedBuilder, ApplicationCommandOptionType, PermissionFlagsBits } = require("discord.js");
const Prefix = require("../../schema/prefix");
const { v2 } = require("../../utils/v2");

module.exports = {
  name: "prefix",
  description: "View or configure the server's command prefix.",
  userPrams: [],
  botPrams: ["EmbedLinks"],
  options: [
    {
      name: "show",
      description: "View the current server prefix.",
      type: ApplicationCommandOptionType.Subcommand,
    },
    {
      name: "set",
      description: "Configure a new command prefix.",
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: "newprefix",
          description: "The new prefix (max 5 characters).",
          type: ApplicationCommandOptionType.String,
          required: true,
        },
      ],
    },
  ],

  /**
   * @param {Client} client
   * @param {CommandInteraction} interaction
   */
  run: async (client, interaction) => {
    await interaction.deferReply({ ephemeral: true });

    const subcommand = interaction.options.getSubcommand();

    if (subcommand === "show") {
      const data = await Prefix.findOne({ guildId: interaction.guildId });
      const currentPrefix = data?.prefix || data?.Prefix || client.prefix;

      const embed = new EmbedBuilder()
        .setTitle("🔑 Command Prefix")
        .setDescription(`The current command prefix for this server is: \`${currentPrefix}\``)
        .setColor(client.embedColor || "#7c3aed")
        .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL() });

      return interaction.editReply(v2({ embeds: [embed] }));
    }

    if (subcommand === "set") {
      if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
        return interaction.editReply(v2("❌ | You need the `Manage Server` permission to change the prefix."));
      }

      const newPrefix = interaction.options.getString("newprefix");
      if (newPrefix.length > 5) {
        return interaction.editReply(v2("❌ | Prefix cannot exceed 5 characters."));
      }

      const data = await Prefix.findOne({ guildId: interaction.guildId });
      const oldPrefix = data?.prefix || data?.Prefix || client.prefix;

      if (!data) {
        const newData = new Prefix({
          guildId: interaction.guildId,
          prefix: newPrefix,
          oldPrefix: oldPrefix,
        });
        await newData.save();
      } else {
        data.oldPrefix = oldPrefix;
        data.prefix = newPrefix;
        await data.save();
      }

      return interaction.editReply(v2(`✅ | Command prefix updated to: \`${newPrefix}\``));
    }
  },
};
