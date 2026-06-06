const { v2 } = require("../../utils/v2");
const {
  EmbedBuilder,
  MessageFlags,
  ButtonBuilder,
  ActionRowBuilder,
  ButtonStyle,
  RoleSelectMenuBuilder,
  UserSelectMenuBuilder,
  PermissionsBitField,
} = require("discord.js");
const Antinuke = require("../../schema/antinuke");
const { isBotOwner } = require("../../utils/owners");
const { clearComponents } = require("../../utils/componentCleanup");

module.exports = {
  name: "whitelist",
  aliases: ["wl"],
  description: "Enable or disable the Anti-Link system and manage settings.",
  category: "Antinuke",
  userPerms: ["ManageGuild"],
  botPerms: ["ManageRoles"],
  cooldown: 3,
  execute: async (message, args, client, prefix) => {
    const authorId = message.author.id;

    let antinukeConfig = await Antinuke.findOne({ guildId: message.guild.id });
    if (!antinukeConfig) {
      antinukeConfig = new Antinuke({ guildId: message.guild.id });
      await antinukeConfig.save();
    }

    // Check if the user is authorized (server owner or extra owner)
    const isAuthorized =
      authorId === message.guild.ownerId ||
      isBotOwner(client, authorId) ||
      (antinukeConfig.extraOwners || []).includes(authorId);

    if (!isAuthorized) {
      return message.reply(v2({
        embeds: [
          new EmbedBuilder()
            
            .setDescription(
              `${client.emoji.cross} | Only the **server owner** or an **extra owner** can use this command.`,
            ),
        ],
      }));
    }

    const guildId = message.guild.id;

    // Fetch or create the Antinuke configuration
    let Whitelistdb;
    try {
      Whitelistdb = await Antinuke.findOne({ guildId });
      if (!Whitelistdb) {
        Whitelistdb = new Antinuke({
          guildId,
          isEnabled: false,
          whitelistUsers: [],
          whitelistRoles: [],
        });
        await Whitelistdb.save();
      }
    } catch (error) {
      return message.reply(
        v2("An error occurred while accessing the database. Please try again later."),
      );
    }

    const mainMenuEmbed = new client.embed()
      .d(
        `Welcome to the **Antinuke Management System**! Use the options below to configure your server's whitelist and protect your community effectively.\n\n` +
          `> _${client.emoji.dot} Add Users to Whitelist - Whitelist specific users who won't be affected by antinuke measures._\n` +
          `> _${client.emoji.dot} Add Roles to Whitelist - Grant certain roles immunity from antinuke restrictions._\n` +
          `> _${client.emoji.dot} View Config - Review the current whitelist settings and the status of the system._\n\n` +
          `-# Select an option below to get started!`,
      )
      .setFooter({
        text: "Antinuke Management System | Protecting your server",
        iconURL: client.user.displayAvatarURL(), // Replace with a relevant icon URL if needed
      });

    const mainMenuRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("add_whitelist_humans")
        .setLabel("Add Users")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId("add_whitelist_roles")
        .setLabel("Add Roles")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId("view_config")
        .setLabel("View Config")
        .setStyle(ButtonStyle.Secondary),
    );

    const backk = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("back")
        .setLabel("back")
        .setStyle(ButtonStyle.Secondary),
    );

    const clear = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("back")
        .setLabel("back")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId("reset")
        .setLabel("reset")
        .setStyle(ButtonStyle.Secondary),
    );

    const mainMessage = await message.reply(v2({
      embeds: [mainMenuEmbed],
      components: [mainMenuRow],
    }));

    const collector = mainMessage.createMessageComponentCollector({
      time: 60000,
    });

    collector.on("collect", async (interaction) => {
      if (interaction.user.id !== message.author.id) {
        return interaction.reply(v2({
          content: "This menu is not for you.",
          flags: MessageFlags.Ephemeral,
        }));
      }

      switch (interaction.customId) {
        case "add_whitelist_humans": {
          const userSelectMenu = new UserSelectMenuBuilder()
            .setCustomId("select_whitelist_users")
            .setPlaceholder("Select users to whitelist")
            .setMinValues(1)
            .setMaxValues(25);

          const userSelectRow = new ActionRowBuilder().addComponents(
            userSelectMenu,
          );

          const userSelectEmbed = new EmbedBuilder()
            .setTitle("Whitelist Users")
            .setDescription("Select users to add to the whitelist.")
            ;

          await interaction.update(v2({
            embeds: [userSelectEmbed],
            components: [userSelectRow, backk],
          }));
          break;
        }

        case "add_whitelist_roles": {
          const roleSelectMenu = new RoleSelectMenuBuilder()
            .setCustomId("select_whitelist_roles")
            .setPlaceholder("Select roles to whitelist")
            .setMinValues(1)
            .setMaxValues(25);

          const roleSelectRow = new ActionRowBuilder().addComponents(
            roleSelectMenu,
          );

          const roleSelectEmbed = new EmbedBuilder()
            .setTitle("Whitelist Roles")
            .setDescription("Select roles to add to the whitelist.")
            ;

          await interaction.update(v2({
            embeds: [roleSelectEmbed],
            components: [roleSelectRow, backk],
          }));
          break;
        }

        case "select_whitelist_users": {
          const selectedUsers = interaction.values; // IDs of selected users
          Whitelistdb.whitelistUsers = [
            ...new Set([...Whitelistdb.whitelistUsers, ...selectedUsers]),
          ]; // Avoid duplicates

          await Whitelistdb.save();

          const successEmbed = new EmbedBuilder()
            .setTitle("Users Added to Whitelist")
            .setDescription(
              `Successfully added ${selectedUsers.map((id) => `<@${id}>`).join(", ")} to the whitelist.`,
            )
            ;

          await interaction.update(v2({
            embeds: [successEmbed],
            components: [backk],
          }));
          break;
        }

        case "select_whitelist_roles": {
          const selectedRoles = interaction.values; // IDs of selected roles
          Whitelistdb.whitelistRoles = [
            ...new Set([...Whitelistdb.whitelistRoles, ...selectedRoles]),
          ]; // Avoid duplicates

          await Whitelistdb.save();

          const successEmbed = new EmbedBuilder()
            .setTitle("Roles Added to Whitelist")
            .setDescription(
              `Successfully added ${selectedRoles.map((id) => `<@&${id}>`).join(", ")} to the whitelist.`,
            )
            ;

          await interaction.update(v2({
            embeds: [successEmbed],
            components: [backk],
          }));
          break;
        }

        case "view_config": {
          const whitelistedUsers = Whitelistdb.whitelistUsers || [];
          const whitelistedRoles = Whitelistdb.whitelistRoles || [];

          const whitelistedUsersDisplay = whitelistedUsers.length
            ? whitelistedUsers.map((id) => `<@${id}>`).join("\n")
            : "No users whitelisted.";

          const whitelistedRolesDisplay = whitelistedRoles.length
            ? whitelistedRoles.map((id) => `<@&${id}>`).join("\n")
            : "No roles whitelisted.";

          const configEmbed = new EmbedBuilder()
            .setTitle("Antinuke Configuration")
            
            .addFields(
              {
                name: "System Status",
                value: Whitelistdb.isEnabled ? "Enabled ✅" : "Disabled ❌",
                inline: false,
              },
              {
                name: "Whitelisted Users",
                value: whitelistedUsersDisplay,
                inline: false,
              },
              {
                name: "Whitelisted Roles",
                value: whitelistedRolesDisplay,
                inline: false,
              },
            )
            .setFooter({
              text: "Manage your whitelist using the buttons in the menu.",
            });

          await interaction.update(v2({
            embeds: [configEmbed],
            components: [clear],
          }));
          break;
        }
        case "back":
          {
            await interaction.update(v2({
              embeds: [mainMenuEmbed],
              components: [mainMenuRow],
            }));
          }
          break;

        case "reset": {
          // Reset the whitelist arrays
          Whitelistdb.whitelistUsers = [];
          Whitelistdb.whitelistRoles = [];
          await Whitelistdb.save();

          const clearEmbed = new EmbedBuilder()
            .setTitle("Whitelist Cleared")
            .setDescription(
              "The whitelist has been successfully reset. All users and roles have been removed.",
            )
            ;

          await interaction.update(v2({
            embeds: [clearEmbed],
            components: [backk],
          }));
          break;
        }
      }
    });

    collector.on("end", async () => {
      await clearComponents(mainMessage);
    });
  },
};
