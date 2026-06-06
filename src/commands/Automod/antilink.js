const { v2 } = require("../../utils/v2");
const {
  EmbedBuilder,
  ButtonBuilder,
  ActionRowBuilder,
  ButtonStyle,
  RoleSelectMenuBuilder,
  UserSelectMenuBuilder,
  ComponentType,
  PermissionsBitField,
} = require("discord.js");
const AntiLink = require("../../schema/antilink");
const { clearComponents } = require("../../utils/componentCleanup");

module.exports = {
  name: "antilink",
  aliases: ["al"],
  description: "Enable or disable the Anti-Link system and manage settings.",
  category: "Automod",
  userPerms: ["ManageGuild"],
  botPerms: ["ManageRoles"],
  cooldown: 3,

  execute: async (message, args, client, prefix) => {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
      return message.reply(v2("You need `Manage Guild` permission to use this command."));
    }

    const guildId = message.guild.id;
    let antiLinkData = await AntiLink.findOne({ guildId });
    if (!antiLinkData) antiLinkData = new AntiLink({ guildId, isEnabled: false });

    const mainMenuEmbed = new EmbedBuilder()
      .setTitle("🔗 Anti-Link System")
      .setDescription("Choose an option:")
      ;

    const mainMenuRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("toggle").setLabel("Enable/Disable").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId("manage_whitelist").setLabel("Manage Whitelist").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("view_config").setLabel("View Config").setStyle(ButtonStyle.Primary)
    );

    const backButton = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("back_to_main").setLabel("Back").setStyle(ButtonStyle.Danger)
    );

    const backToChoose = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("back_to_choose").setLabel("Back").setStyle(ButtonStyle.Primary)
    );

    const whitelistEmbed = new EmbedBuilder()
      .setTitle("👥 Manage Whitelist")
      .setDescription("Choose an option to add users or roles to the whitelist.")
      ;

    const whitelistMenu = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("add_whitelist_humans").setLabel("Add Users").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("add_whitelist_roles").setLabel("Add Roles").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("back_to_main").setLabel("Back").setStyle(ButtonStyle.Danger)
    );

    const mainMessage = await message.reply(v2({
      embeds: [mainMenuEmbed],
      components: [mainMenuRow],
    }));

    const collector = mainMessage.createMessageComponentCollector({
      time: 60000,
      filter: (i) => i.user.id === message.author.id,
    });

    collector.on("collect", async (interaction) => {
      const id = interaction.customId;

      if (id === "toggle") {
        antiLinkData.isEnabled = !antiLinkData.isEnabled;
        await antiLinkData.save();

        const toggleEmbed = new EmbedBuilder()
          .setTitle("🔗 Anti-Link System")
          .setDescription(`The system has been **${antiLinkData.isEnabled ? "enabled" : "disabled"}**.`)
          ;

        return interaction.update(v2({ embeds: [toggleEmbed], components: [backButton] }));
      }

      if (id === "view_config") {
        const whitelistedUsers = antiLinkData.whitelistUsers || [];
        const whitelistedRoles = antiLinkData.whitelistRoles || [];

        const configEmbed = new EmbedBuilder()
          .setTitle("📄 Anti-Link Configuration")
          
          .addFields(
            { name: "System Status", value: antiLinkData.isEnabled ? "Enabled" : "Disabled", inline: false },
            {
              name: "Whitelisted Users",
              value: whitelistedUsers.length ? whitelistedUsers.map((id) => `<@${id}>`).join(", ") : "None",
              inline: false,
            },
            {
              name: "Whitelisted Roles",
              value: whitelistedRoles.length ? whitelistedRoles.map((id) => `<@&${id}>`).join(", ") : "None",
              inline: false,
            }
          );

        return interaction.update(v2({ embeds: [configEmbed], components: [backButton] }));
      }

      if (id === "manage_whitelist") {
        return interaction.update(v2({ embeds: [whitelistEmbed], components: [whitelistMenu] }));
      }

      if (id === "add_whitelist_humans") {
        const userSelect = new UserSelectMenuBuilder()
          .setCustomId("select_whitelist_users")
          .setPlaceholder("Select users to whitelist")
          .setMinValues(1)
          .setMaxValues(25);

        const row = new ActionRowBuilder().addComponents(userSelect);

        const embed = new EmbedBuilder()
          .setTitle("👤 Whitelist Users")
          .setDescription("Select users to add to the whitelist.")
          ;

        await interaction.update(v2({ embeds: [embed], components: [row, backToChoose] }));
      }

      if (id === "add_whitelist_roles") {
        const roleSelect = new RoleSelectMenuBuilder()
          .setCustomId("select_whitelist_roles")
          .setPlaceholder("Select roles to whitelist")
          .setMinValues(1)
          .setMaxValues(25);

        const row = new ActionRowBuilder().addComponents(roleSelect);

        const embed = new EmbedBuilder()
          .setTitle("🎭 Whitelist Roles")
          .setDescription("Select roles to add to the whitelist.")
          ;

        await interaction.update(v2({ embeds: [embed], components: [row, backToChoose] }));
      }

      if (id === "back_to_main") {
        return interaction.update(v2({ embeds: [mainMenuEmbed], components: [mainMenuRow] }));
      }

      if (id === "back_to_choose") {
        return interaction.update(v2({ embeds: [whitelistEmbed], components: [whitelistMenu] }));
      }
    });

    // User select collector
    const userCollector = mainMessage.createMessageComponentCollector({
      componentType: ComponentType.UserSelect,
      time: 60000,
      filter: (i) => i.user.id === message.author.id,
    });

    userCollector.on("collect", async (i) => {
      if (i.customId === "select_whitelist_users") {
        const selected = i.values;
        antiLinkData.whitelistUsers ??= [];
        for (const id of selected) {
          if (!antiLinkData.whitelistUsers.includes(id)) antiLinkData.whitelistUsers.push(id);
        }
        await antiLinkData.save();

        await i.reply(v2({ content: `${client.emoji?.tick || "✅"} Added ${selected.length} user(s) to whitelist.`, ephemeral: true }));
      }
    });

    // Role select collector
    const roleCollector = mainMessage.createMessageComponentCollector({
      componentType: ComponentType.RoleSelect,
      time: 60000,
      filter: (i) => i.user.id === message.author.id,
    });

    roleCollector.on("collect", async (i) => {
      if (i.customId === "select_whitelist_roles") {
        const selected = i.values;
        antiLinkData.whitelistRoles ??= [];
        for (const id of selected) {
          if (!antiLinkData.whitelistRoles.includes(id)) antiLinkData.whitelistRoles.push(id);
        }
        await antiLinkData.save();

        await i.reply(v2({ content: `${client.emoji?.tick || "✅"} Added ${selected.length} role(s) to whitelist.`, ephemeral: true }));
      }
    });

    collector.on("end", () => {
      clearComponents(mainMessage);
    });
  },
};
