const { v2 } = require("../../utils/v2");
const {
  EmbedBuilder,
  MessageFlags,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  RoleSelectMenuBuilder,
  PermissionsBitField,
} = require("discord.js");
const VoiceRole = require("../../schema/voicerole"); // Your schema for voice role management
const { clearComponents } = require("../../utils/componentCleanup");

module.exports = {
  name: "invcrole",
  category: "Role",
  aliases: ["vcr"],
  description:
    "Configure roles to assign/remove when users join/leave voice channels.",
  botParams: ["ManageRoles"],
  cooldown: 3,
  execute: async (message, args, client) => {
    if (
      !message.member.permissions.has(PermissionsBitField.Flags.Administrator)
    ) {
      return message.reply(
        v2("You need `Administrator` permission to use this command."),
      );
    }

    // Main menu embed
    const menuEmbed = new EmbedBuilder()
      .setTitle("Voice Channel Role Configuration")
      .setDescription(
        "Manage roles for users when they join or leave a voice channel. Select an option below:\n\n" +
          "**Options:**\n" +
          "• Add Role for VC Join\n" +
          "• Remove Role for VC Leave\n" +
          "• View Current Configurations\n" +
          "• Reset All Settings",
      )
      ;

    // Main menu buttons
    const mainRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("add_role")
        .setLabel("Add Role")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId("remove_role")
        .setLabel("Remove Role")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId("view_config")
        .setLabel("View Config")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId("reset_config")
        .setLabel("Reset Settings")
        .setStyle(ButtonStyle.Danger),
    );

    // Send menu
    const sentMessage = await message.reply(v2({
      embeds: [menuEmbed],
      components: [mainRow],
    }));

    // Interaction collector
    const collector = sentMessage.createMessageComponentCollector({
      time: 60000,
    });

    collector.on("collect", async (interaction) => {
      if (interaction.user.id !== message.author.id) {
        return interaction.reply(v2({
          content: "This menu is not for you.",
          flags: MessageFlags.Ephemeral,
        }));
      }

      const guildId = message.guild.id;

      // Add Role
      if (interaction.customId === "add_role") {
        const roleSelectMenu = new RoleSelectMenuBuilder()
          .setCustomId("select_add_role")
          .setPlaceholder("Select a role to assign on VC join")
          .setMinValues(1)
          .setMaxValues(1); // Only one role can be selected

        const addRoleRow = new ActionRowBuilder().addComponents(roleSelectMenu);

        await interaction.update(v2({
          content: "Select a role to add for users joining a voice channel:",
          components: [addRoleRow],
          embeds: [],
        }));
      }

      if (interaction.customId === "select_add_role") {
        const selectedRole = interaction.values[0];

        try {
          let voiceRole = await VoiceRole.findOne({ guildId });
          if (!voiceRole) {
            voiceRole = new VoiceRole({ guildId, roleId: selectedRole });
          } else {
            voiceRole.roleId = selectedRole;
          }
          await voiceRole.save();

          const successEmbed = new EmbedBuilder()
            .setDescription(
              `Successfully set <@&${selectedRole}> as the role for VC join.`,
            )
            ;

          await interaction.update(v2({
            content: "",
            embeds: [successEmbed],
            components: [],
          }));
        } catch (err) {
          console.error(err);
          await interaction.update(v2({
            content:
              "An error occurred while saving the role. Please try again.",
            components: [],
            embeds: [],
          }));
        }
      }

      // Remove Role
      if (interaction.customId === "remove_role") {
        try {
          const voiceRole = await VoiceRole.findOne({ guildId });

          if (!voiceRole || !voiceRole.roleId) {
            return interaction.update(v2({
              content: "No role is currently set for VC leave.",
              components: [],
              embeds: [],
            }));
          }

          const roleId = voiceRole.roleId;
          voiceRole.roleId = null; // Remove the role configuration
          await voiceRole.save();

          const removedEmbed = new EmbedBuilder()
            .setDescription(
              `Successfully removed <@&${roleId}> as the role for VC leave.`,
            )
            ;

          await interaction.update(v2({
            content: "",
            embeds: [removedEmbed],
            components: [],
          }));
        } catch (err) {
          console.error(err);
          await interaction.update(v2({
            content:
              "An error occurred while removing the role. Please try again.",
            components: [],
            embeds: [],
          }));
        }
      }

      // View Config
      if (interaction.customId === "view_config") {
        try {
          const voiceRole = await VoiceRole.findOne({ guildId });

          const roleId = voiceRole?.roleId;
          const role = roleId ? `<@&${roleId}>` : "None";

          const configEmbed = new EmbedBuilder()
            .setTitle("Voice Role Configuration")
            .setDescription(`**Role on VC Join:** ${role}`)
            ;

          await interaction.update(v2({
            content: "",
            embeds: [configEmbed],
            components: [],
          }));
        } catch (err) {
          console.error(err);
          await interaction.update(v2({
            content: "An error occurred while fetching the configuration.",
            components: [],
            embeds: [],
          }));
        }
      }

      // Reset Config
      if (interaction.customId === "reset_config") {
        try {
          await VoiceRole.findOneAndDelete({ guildId });

          const resetEmbed = new EmbedBuilder()
            .setDescription("Voice role configuration has been reset.")
            ;

          await interaction.update(v2({
            content: "",
            embeds: [resetEmbed],
            components: [],
          }));
        } catch (err) {
          console.error(err);
          await interaction.update(v2({
            content: "An error occurred while resetting the configuration.",
            components: [],
            embeds: [],
          }));
        }
      }
    });

    collector.on("end", () => {
      clearComponents(sentMessage);
    });
  },
};
