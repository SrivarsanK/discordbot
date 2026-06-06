const { v2 } = require("../../utils/v2");
const {
  EmbedBuilder,
  MessageFlags,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  RoleSelectMenuBuilder,
  StringSelectMenuBuilder,
  PermissionsBitField,
} = require("discord.js");
const AutoRole = require("../../schema/autorole");
const { clearComponents } = require("../../utils/componentCleanup");

module.exports = {
  name: "autorole",
  category: "Role",
  aliases: ["atr"],
  description: "Configure and manage auto-roles for humans and bots.",
  botParams: ["SendMessages"],
  cooldown: 3,
  execute: async (message, args, client, prefix) => {
    if (
      !message.member.permissions.has(PermissionsBitField.Flags.Administrator)
    ) {
      return message.reply(
        v2("You need `Administrator` permission to use this command."),
      );
    }

    const reset = new ActionRowBuilder().addComponents(
      new client.button().s("resett", "Reset Settings"),
    );
    // Menu embed
    const menuEmbed = new EmbedBuilder()
      .setTitle("AutoRole Configuration")
      .setDescription("Choose an option below:")
      ;

    // Menu options
    const mainRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("add")
        .setLabel("Add Role")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId("remove")
        .setLabel("Remove Role")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId("config")
        .setLabel("View Config")
        .setStyle(ButtonStyle.Secondary),
    );

    const rev = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("back")
        .setEmoji(client.emoji.left)
        .setStyle(ButtonStyle.Secondary),
    );
    const addback = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("addback")
        .setEmoji(client.emoji.left)
        .setStyle(ButtonStyle.Secondary),
    );

    // Send the menu
    const sentMessage = await message.reply(v2({
      embeds: [menuEmbed],
      components: [mainRow],
    }));

    // Collector for interactions
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

      const addRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("back")
          .setEmoji(client.emoji.left)
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId("add_humans")
          .setLabel("Humans")
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId("add_bots")
          .setLabel("Bots")
          .setStyle(ButtonStyle.Secondary),
      );

      // Add roles logic
      if (interaction.customId === "add") {
        await interaction.update(v2({
          content: "Choose a role type to add:",
          components: [addRow],
          embeds: [],
        }));
      }

      // Handle role selection
      if (
        interaction.customId === "add_humans" ||
        interaction.customId === "add_bots"
      ) {
        const roleType =
          interaction.customId === "add_humans" ? "Humans" : "Bots";

        const roleSelectMenu = new RoleSelectMenuBuilder()
          .setCustomId(`select_${roleType.toLowerCase()}`)
          .setPlaceholder(`Select roles for ${roleType}`)
          .setMinValues(1)
          .setMaxValues(25); // Maximum selectable roles

        const selectRow = new ActionRowBuilder().addComponents(roleSelectMenu);

        await interaction.update(v2({
          content: `Select roles to add for ${roleType}:`,
          components: [selectRow, addback],
          embeds: [],
        }));
      }

      // Save roles
      if (
        interaction.customId.startsWith("select_humans") ||
        interaction.customId.startsWith("select_bots")
      ) {
        const roleIds = interaction.values;
        const roleType = interaction.customId.startsWith("select_humans")
          ? "humanRoles"
          : "botRoles";

        try {
          let autoRole = await AutoRole.findOne({ guildId: message.guild.id });
          if (!autoRole) {
            autoRole = new AutoRole({
              guildId: message.guild.id,
              humanRoles: [],
              botRoles: [],
            });
          }

          roleIds.forEach((roleId) => {
            if (!autoRole[roleType].includes(roleId)) {
              autoRole[roleType].push(roleId);
            }
          });

          await autoRole.save();

          const addedRoles = roleIds
            .map((roleId) => `<@&${roleId}>`)
            .join(", ");
          const resultEmbed = new client.embed().d(
            `Successfully added the following roles to ${roleType === "humanRoles" ? "Humans" : "Bots"}: ${addedRoles}`,
          );
          await interaction.update(v2({
            components: [],
            embeds: [resultEmbed],
          }));
        } catch (err) {
          console.error(err);
          await interaction.update(v2({
            content: "An error occurred while adding the roles.",
            components: [],
            embeds: [],
          }));
        }
      }

      // View configuration
      if (interaction.customId === "config") {
        try {
          const autoRole = await AutoRole.findOne({
            guildId: message.guild.id,
          });

          if (
            !autoRole ||
            (!autoRole.humanRoles.length && !autoRole.botRoles.length)
          ) {
            const configEmbed = new EmbedBuilder()
              .setTitle("Autorole Config")
              .setDescription(
                `> **Current Autorole Configuration for ${message.guild.name}:**\n\n` +
                  `**Human Roles:**\nNone\n\n` +
                  `**Bot Roles:**\nNone`,
              )
              ;
            return interaction.update(v2({
              components: [rev],
              embeds: [configEmbed],
            }));
          }

          const humanRoles =
            autoRole.humanRoles.map((roleId) => `<@&${roleId}>`).join(", ") ||
            "None";
          const botRoles =
            autoRole.botRoles.map((roleId) => `<@&${roleId}>`).join(", ") ||
            "None";

          const configEmbed = new EmbedBuilder()
            .setTitle("AutoRole Configuration")
            .setDescription(`**Humans:** ${humanRoles}\n**Bots:** ${botRoles}`)
            ;

          await interaction.update(v2({
            content: "Here is the current configuration:",
            embeds: [configEmbed],
            components: [rev],
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

      // Remove roles logic
      if (interaction.customId === "remove") {
        const autoRole = await AutoRole.findOne({ guildId: message.guild.id });
        if (
          !autoRole ||
          (!autoRole.humanRoles.length && !autoRole.botRoles.length)
        ) {
          return interaction.update(v2({
            content: "No roles have been configured yet to remove.",
            components: [rev],
            embeds: [],
          }));
        }

        const rolesToRemove = [
          ...autoRole.humanRoles.map((roleId) => {
            const role = message.guild.roles.cache.get(roleId);
            return {
              label: `Human: ${role ? role.name : "Unknown Role"}`,
              value: roleId,
            };
          }),
          ...autoRole.botRoles.map((roleId) => {
            const role = message.guild.roles.cache.get(roleId);
            return {
              label: `Bot: ${role ? role.name : "Unknown Role"}`,
              value: roleId,
            };
          }),
        ];

        const selectMenu = new StringSelectMenuBuilder()
          .setCustomId("remove_roles")
          .setPlaceholder("Select roles to remove")
          .setMinValues(1)
          .setMaxValues(rolesToRemove.length)
          .addOptions(rolesToRemove);

        const removeRow = new ActionRowBuilder().addComponents(selectMenu);

        await interaction.update(v2({
          content: "Select roles to remove:",
          components: [removeRow, rev],
          embeds: [],
        }));
      }

      // Handle role removal
      if (interaction.customId === "remove_roles") {
        const roleIds = interaction.values;

        try {
          const autoRole = await AutoRole.findOne({
            guildId: message.guild.id,
          });

          if (!autoRole) {
            return interaction.update(v2({
              content: "No roles are configured to remove.",
              components: [],
              embeds: [],
            }));
          }

          autoRole.humanRoles = autoRole.humanRoles.filter(
            (roleId) => !roleIds.includes(roleId),
          );
          autoRole.botRoles = autoRole.botRoles.filter(
            (roleId) => !roleIds.includes(roleId),
          );

          await autoRole.save();

          const removedRoles = roleIds
            .map((roleId) => `<@&${roleId}>`)
            .join(", ");
          const embed = new client.embed().d(
            `Successfully removed the following roles: ${removedRoles}`,
          );
          await interaction.update(v2({
            components: [],
            embeds: [embed],
          }));
        } catch (err) {
          console.error(err);
          await interaction.update(v2({
            content:
              "An error occurred while removing the roles. Please try again.",
            components: [],
            embeds: [],
          }));
        }
      }
      if (interaction.customId === "back") {
        interaction.update(v2({
          content: "",
          embeds: [menuEmbed],
          components: [mainRow],
        }));
      }

      if (interaction.customId === "addback") {
        interaction.update(v2({ content: "", components: [addRow], embeds: [] }));
      }
      if (interaction.customId === "resett") {
        try {
          // Find and delete the AutoRole document for this guild
          await AutoRole.findOneAndDelete({ guildId: message.guild.id });

          // Send a confirmation message
          await interaction.update(v2({
            content:
              "Auto-role settings have been successfully reset to default.",
            components: [],
            embeds: [],
          }));
        } catch (err) {
          console.error("Error while resetting settings:", err);

          // Send an error message
          await interaction.update(v2({
            content:
              "An error occurred while resetting the settings. Please try again.",
            components: [],
            embeds: [],
          }));
        }
      }

      collector.on("end", () => {
        clearComponents(sentMessage);
      });
    });
  },
};
