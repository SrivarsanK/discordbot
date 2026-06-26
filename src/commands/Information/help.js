/** @format */

const { v2 } = require("../../utils/v2");
const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  MessageFlags,
  SectionBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  StringSelectMenuBuilder,
  TextDisplayBuilder,
  ThumbnailBuilder,
} = require("discord.js");
const { getInviteUrl } = require("../../utils/botMeta");
const { isBotOwner } = require("../../utils/owners");

const CATEGORY_ORDER = [
  "Antinuke",
  "Automod",
  "Config",
  "Moderation",
  "Welcome",
  "Music",
  "Playlist",
  "Profile",
  "LeetCode",
  "Image",
  "Fun",
  "Extra",
  "Role",
  "Voice",
  "Utility",
  "Information",
  "Owner",
];

const CATEGORY_META = {
  antinuke: ["antinuke", "Raid and admin abuse protection"],
  automod: ["automod", "Automatic moderation rules"],
  config: ["config", "Server and bot setup"],
  moderation: ["moderation", "Ban, mute, purge, role tools"],
  welcome: ["welcome", "Join messages and welcome setup"],
  music: ["music", "Play, queue, filters, controls"],
  playlist: ["playlist", "Saved playlists and sharing"],
  profile: ["profile", "Bio and profile cards"],
  leetcode: ["leetcode", "LeetCode tracking leaderboard"],
  image: ["image", "Image and avatar actions"],
  fun: ["fun", "Games and fun commands"],
  extra: ["extra", "Small automation helpers"],
  role: ["role", "Role setup and role tools"],
  voice: ["voice", "Voice moderation controls"],
  utility: ["utility", "General server utilities"],
  information: ["information", "Bot, user, and server info"],
  owner: ["owner", "Private bot owner tools"],
};

const HOME_SECTIONS = [
  {
    title: "Security & Setup",
    categories: ["antinuke", "automod", "config", "moderation", "welcome"],
  },
  {
    title: "Music & Identity",
    categories: ["music", "playlist", "profile", "image"],
  },
  {
    title: "Community Tools",
    categories: ["fun", "extra", "role", "voice", "utility", "information", "leetcode"],
  },
  {
    title: "Bot Control",
    categories: ["owner"],
  },
];

const QUICK_CATEGORIES = ["music", "config", "profile"];
const MAX_TEXT_LENGTH = 3400;

module.exports = {
  name: "help",
  category: "Information",
  aliases: ["h", "cmds", "commands"],
  description: "Help with all commands, or one specific command.",
  botParams: ["EmbedLinks", "SendMessages"],
  cooldown: 3,
  execute: async (message, args, client, prefix) => {
    const context = buildContext(client, message.author.id, prefix);

    if (args[0]) {
      return message.channel.send(v2({
        components: [buildCommandContainer(context, args[0])],
        flags: MessageFlags.IsComponentsV2,
      }));
    }

    let currentView = "home";
    const sentMessage = await message.channel.send(v2({
      components: buildViewComponents(context, currentView),
      flags: MessageFlags.IsComponentsV2,
    }));

    const collector = sentMessage.createMessageComponentCollector({
      filter: (interaction) => {
        if (interaction.user.id === message.author.id) return true;

        interaction.reply(v2({
          content: `${context.cross} | That's not your help menu. Run \`${prefix}help\` to open your own.`,
          ephemeral: true,
        })).catch(() => {});
        return false;
      },
      time: 120000,
    });

    collector.on("collect", async (interaction) => {
      if (interaction.isButton() && interaction.customId === "help_home") {
        currentView = "home";
      } else if (interaction.isButton() && interaction.customId.startsWith("help_quick_")) {
        currentView = interaction.customId.replace("help_quick_", "");
      } else if (interaction.isStringSelectMenu() && interaction.customId === "help_select") {
        currentView = interaction.values[0];
      } else {
        return;
      }

      return interaction.update(v2({
        components: buildViewComponents(context, currentView),
        flags: MessageFlags.IsComponentsV2,
      }));
    });

    collector.on("end", () => {
      sentMessage.edit(v2({
        components: buildViewComponents(context, currentView, true),
        flags: MessageFlags.IsComponentsV2,
      })).catch(() => {});
    });
  },
};

function buildContext(client, userId, prefix) {
  const isOwner = isBotOwner(client, userId);
  const commands = client.commands.filter(
    (command) => isOwner || normalizeCategory(command.category) !== "owner",
  );
  const groups = groupCommands(commands);
  const categories = buildCategories(client, groups, isOwner);

  return {
    client,
    prefix,
    commands,
    groups,
    categories,
    inviteUrl: getInviteUrl(client),
    cross: client.emoji?.cross || "No",
  };
}

function buildViewComponents(context, view, disabled = false) {
  const category = context.categories.find((item) => item.value === view);
  const container = category
    ? buildCategoryContainer(context, category)
    : buildHomeContainer(context);

  addDivider(container);
  container.addActionRowComponents(
    buildSelectRow(context.categories, category?.value, disabled),
    buildButtonRow(context, disabled),
  );

  return [container];
}

function groupCommands(commands) {
  const groups = new Map();

  for (const command of commands.values()) {
    const category = normalizeCategory(command.category);
    if (!groups.has(category)) groups.set(category, []);
    groups.get(category).push(command);
  }

  for (const list of groups.values()) {
    list.sort((a, b) => a.name.localeCompare(b.name));
  }

  return groups;
}

function buildCategories(client, groups, includeOwner) {
  const discovered = [...groups.keys()]
    .map((category) => titleCase(category))
    .filter((category) => !CATEGORY_ORDER.includes(category));
  const ordered = [...CATEGORY_ORDER, ...discovered];

  return ordered
    .map((label) => {
      const value = label.toLowerCase();
      if (value === "owner" && !includeOwner) return null;

      const commands = groups.get(value) || [];
      if (!commands.length) return null;

      const [emojiKey, description] = CATEGORY_META[value] || [value, "Commands"];
      return {
        label,
        value,
        description,
        count: commands.length,
        emoji: pickEmoji(client, emojiKey),
      };
    })
    .filter(Boolean);
}

function buildHomeContainer(context) {
  const { client, commands, categories, prefix } = context;
  const container = new ContainerBuilder();
  const avatarUrl = client.user.displayAvatarURL({ extension: "png", size: 256 });
  const quickPicks = ["play", "queue", "profile", "playlist", "config", "help"]
    .map((name) => commands.get(name))
    .filter(Boolean)
    .map((command) => `\`${prefix}${command.name}\``)
    .join("  ");

  container.addSectionComponents(
    new SectionBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `## ${pickEmoji(client, "search") || ""} ${client.user.username} Command Center\n` +
          `-# Prefix \`${prefix}\` | ${commands.size} commands | ${client.slashCommands.size} slash | ${client.guilds.cache.size} servers`,
        ),
      )
      .setThumbnailAccessory(new ThumbnailBuilder({ media: { url: avatarUrl } })),
  );

  addDivider(container);

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `**Start Here**\n` +
      `> Use the category menu for browsing.\n` +
      `> Use \`${prefix}help <command>\` for details.\n` +
      `> Quick picks: ${quickPicks || `\`${prefix}play\`  \`${prefix}help\``}`,
    ),
  );

  addDivider(container);

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(formatHomeSections(categories)),
  );

  addDivider(container);

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `-# Tip: category buttons jump straight to the busy pages, and the dropdown has every command group.`,
    ),
  );

  return container;
}

function buildCategoryContainer(context, category) {
  const commands = context.groups.get(category.value) || [];
  const container = new ContainerBuilder();
  const icon = category.emoji || iconFallback(category.value);
  const commandText = formatCommandLines(commands, context.prefix);

  container.addSectionComponents(
    new SectionBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `## ${icon} ${category.label}\n` +
          `-# ${category.description} | ${commands.length} command${commands.length === 1 ? "" : "s"}`,
        ),
      )
      .setThumbnailAccessory(new ThumbnailBuilder({
        media: { url: context.client.user.displayAvatarURL({ extension: "png", size: 128 }) },
      })),
  );

  addDivider(container);

  for (const [index, chunkText] of splitText(commandText, MAX_TEXT_LENGTH).entries()) {
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        index === 0 ? `**Commands**\n${chunkText}` : chunkText,
      ),
    );
  }

  addDivider(container);

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `-# Try \`${context.prefix}help ${commands[0]?.name || category.value}\` to inspect usage, aliases, permissions, and cooldown.`,
    ),
  );

  return container;
}

function buildCommandContainer(context, query) {
  const command = findCommand(context.commands, query);
  const container = new ContainerBuilder();

  if (!command) {
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `## ${pickEmoji(context.client, "warn") || ""} Command Not Found\n` +
        `No command matched \`${query}\`.\n\n-# Run \`${context.prefix}help\` and choose a category.`,
      ),
    );
    return container;
  }

  const category = normalizeCategory(command.category);
  const aliases = command.aliases?.length
    ? command.aliases.map((alias) => `\`${alias}\``).join(" ")
    : "`none`";
  const usage = Array.isArray(command.usage)
    ? command.usage.join(" | ")
    : command.usage;
  const permissions = [
    command.userPerms?.length ? `User: \`${command.userPerms.join(", ")}\`` : null,
    command.botPerms?.length ? `Bot: \`${command.botPerms.join(", ")}\`` : null,
    command.owner ? "Owner only" : null,
    command.inVoiceChannel ? "Requires voice channel" : null,
    command.sameVoiceChannel ? "Requires same voice channel" : null,
    command.player ? "Requires active player" : null,
  ].filter(Boolean).join("\n") || "`none`";

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `## ${pickEmoji(context.client, category) || iconFallback(category)} ${context.prefix}${command.name}\n` +
      `${cleanText(command.description || "No description set.", 180)}`,
    ),
  );

  addDivider(container);

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `**Usage**\n\`${context.prefix}${command.name}${usage ? ` ${usage}` : ""}\`\n\n` +
      `**Aliases**\n${aliases}\n\n` +
      `**Category**\n\`${command.category || "Uncategorized"}\`\n\n` +
      `**Cooldown**\n\`${command.cooldown || 3}s\`\n\n` +
      `**Access**\n${permissions}`,
    ),
  );

  return container;
}

function buildSelectRow(categories, selected, disabled = false) {
  const options = categories.slice(0, 25).map((category) => {
    const option = {
      label: `${category.label} (${category.count})`,
      value: category.value,
      description: category.description,
      default: category.value === selected,
    };

    if (category.emoji) option.emoji = category.emoji;
    return option;
  });

  if (!options.length) {
    options.push({
      label: "No categories",
      value: "none",
      description: "No commands are loaded",
    });
  }

  const menu = new StringSelectMenuBuilder()
    .setCustomId("help_select")
    .setPlaceholder("Browse command categories")
    .setDisabled(disabled)
    .addOptions(options);

  return new ActionRowBuilder().addComponents(menu);
}

function buildButtonRow(context, disabled = false) {
  const row = new ActionRowBuilder();
  const homeButton = new ButtonBuilder()
    .setCustomId("help_home")
    .setLabel("Home")
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(disabled);
  const homeEmoji = pickEmoji(context.client, "home");

  if (homeEmoji) homeButton.setEmoji(homeEmoji);
  row.addComponents(homeButton);

  for (const category of QUICK_CATEGORIES) {
    if (!context.categories.some((item) => item.value === category)) continue;

    const meta = context.categories.find((item) => item.value === category);
    const button = new ButtonBuilder()
      .setCustomId(`help_quick_${category}`)
      .setLabel(meta.label)
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(disabled);

    if (meta.emoji) button.setEmoji(meta.emoji);
    row.addComponents(button);
  }

  if (context.inviteUrl) {
    row.addComponents(
      new ButtonBuilder()
        .setLabel("Invite")
        .setStyle(ButtonStyle.Link)
        .setURL(context.inviteUrl),
    );
  }

  return row;
}

function formatHomeSections(categories) {
  const byValue = new Map(categories.map((category) => [category.value, category]));
  const sections = [];

  for (const section of HOME_SECTIONS) {
    const line = section.categories
      .map((value) => byValue.get(value))
      .filter(Boolean)
      .map((category) => {
        const icon = category.emoji || iconFallback(category.value);
        return `${icon} **${category.label}** \`${category.count}\``;
      })
      .join("  ");

    if (line) {
      sections.push(`**${section.title}**\n> ${line}`);
    }
  }

  return sections.join("\n\n");
}

function formatCommandLines(commands, prefix) {
  if (!commands.length) return "*No commands found in this category.*";

  return commands.map((command) => {
    const tags = [
      command.owner ? "owner" : null,
      command.inVoiceChannel ? "voice" : null,
      command.player ? "player" : null,
    ].filter(Boolean);
    const tagText = tags.length ? ` - ${tags.map((tag) => `\`${tag}\``).join(" ")}` : "";

    return `> \`${prefix}${command.name}\` - ${cleanText(command.description || "No description set.", 90)}${tagText}`;
  }).join("\n");
}

function findCommand(commands, query) {
  const lowered = String(query || "").toLowerCase();
  return commands.get(lowered) ||
    commands.find((command) => command.aliases?.some((alias) => String(alias).toLowerCase() === lowered));
}

function addDivider(container) {
  container.addSeparatorComponents(
    new SeparatorBuilder()
      .setDivider(true)
      .setSpacing(SeparatorSpacingSize.Small),
  );
}

function pickEmoji(client, key) {
  const aliases = {
    image: "profile",
    home: "music",
    search: "about",
    config: "filter",
    extra: "jump",
    fun: "warn",
    information: "about",
    moderation: "warn",
    leetcode: "about",
    profile: "about",
    role: "addsong",
    utility: "about",
    voice: "volumehigh",
    welcome: "join",
    owner: "warn",
  };
  const value = client.emoji?.[key] || client.emoji?.[aliases[key]];
  if (!value || value === "undefined") return null;
  return value;
}

function iconFallback(category) {
  const icons = {
    antinuke: "[!]",
    automod: "[A]",
    config: "[C]",
    moderation: "[M]",
    welcome: "[W]",
    music: "[M]",
    playlist: "[#]",
    profile: "[U]",
    leetcode: "[L]",
    image: "[I]",
    fun: "[*]",
    extra: "[+]",
    role: "[R]",
    voice: "[V]",
    utility: "[T]",
    information: "[?]",
    owner: "[O]",
  };
  return icons[category] || "[>]";
}

function splitText(text, maxLength) {
  const chunks = [];
  let current = "";

  for (const line of String(text).split("\n")) {
    if ((current + "\n" + line).trim().length > maxLength && current) {
      chunks.push(current);
      current = line;
    } else {
      current = current ? `${current}\n${line}` : line;
    }
  }

  if (current) chunks.push(current);
  return chunks;
}

function cleanText(value, maxLength) {
  const text = String(value).replace(/\s+/g, " ").trim();
  return text.length > maxLength ? `${text.slice(0, maxLength - 3)}...` : text;
}

function normalizeCategory(category) {
  return String(category || "Other").toLowerCase();
}

function titleCase(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
