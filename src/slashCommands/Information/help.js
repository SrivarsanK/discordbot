/** @format */

const { v2 } = require("../../utils/v2");

const {
  EmbedBuilder,
  MessageFlags,
  CommandInteraction,
  Client,
  ButtonBuilder,
  ActionRowBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
} = require("discord.js");
const { clearComponents } = require("../../utils/componentCleanup");

module.exports = {
  name: "help",
  description: "Help Menu!",
  userPrams: [],
  botPrams: ["EMBED_LINKS"],

  run: async (client, interaction, prefix) => {
    await interaction.deferReply({
      ephemeral: false,
    });

    const emojiMap = {
      antinuke: client.emoji.warn || "🛡️",
      automod: client.emoji.warn || "🛑",
      config: client.emoji.filter || "⚙️",
      extra: client.emoji.jump || "➕",
      fun: client.emoji.warn || "🎯",
      image: client.emoji.about || "🖼️",
      information: client.emoji.about || "ℹ️",
      leetcode: client.emoji.about || "🧠",
      moderation: client.emoji.warn || "🔧",
      music: client.emoji.music || "🎵",
      playlist: client.emoji.playlist || "📻",
      profile: client.emoji.about || "👤",
      role: client.emoji.addsong || "👥",
      utility: client.emoji.about || "🛠️",
      voice: client.emoji.volumehigh || "🔊",
      welcome: client.emoji.join || "👋",
    };

    const embed = new client.embed()
      .d(
        `Hey ${interaction.member}, I'm ${client.user}!
- **A complete Music Bot for your server**
- **Providing you the best quality music**`,
      )
      .addFields({
        name: `${client.emoji.search || "🔍"} **__My Categories:__**`,
        value: `
> ${emojiMap.antinuke} \`:\` **Antinuke**
> ${emojiMap.automod} \`:\` **Automod**
> ${emojiMap.config} \`:\` **Config**
> ${emojiMap.extra} \`:\` **Extra**
> ${emojiMap.fun} \`:\` **Fun**
> ${emojiMap.image} \`:\` **Image**
> ${emojiMap.information} \`:\` **Information**
> ${emojiMap.leetcode} \`:\` **LeetCode**
> ${emojiMap.moderation} \`:\` **Moderation**
> ${emojiMap.music} \`:\` **Music**
> ${emojiMap.playlist} \`:\` **Playlists**
> ${emojiMap.profile} \`:\` **Profile**
> ${emojiMap.role} \`:\` **Role**
> ${emojiMap.utility} \`:\` **Utility**
> ${emojiMap.voice} \`:\` **Voice**
> ${emojiMap.welcome} \`:\` **Welcome**
        `,
      })
      .thumb(interaction.member.displayAvatarURL())
      .setFooter({
        text: "Modified by SrivarsanK",
        iconURL: interaction.member.displayAvatarURL({ dynamic: true }),
      });

    const buttonRow = new ActionRowBuilder().addComponents(
      new client.button().s("home", client.emoji.home ? null : "Home", client.emoji.home || null),
    );

    const commandCategories = [
      {
        label: "Antinuke",
        value: "antinuke",
        description: "Raid and admin abuse protection",
        emoji: emojiMap.antinuke,
      },
      {
        label: "Automod",
        value: "automod",
        description: "Automatic moderation rules",
        emoji: emojiMap.automod,
      },
      {
        label: "Config",
        value: "config",
        description: "Server and bot setup",
        emoji: emojiMap.config,
      },
      {
        label: "Extra",
        value: "extra",
        description: "Autoresponder and reaction helpers",
        emoji: emojiMap.extra,
      },
      {
        label: "Fun",
        value: "fun",
        description: "Games and fun commands",
        emoji: emojiMap.fun,
      },
      {
        label: "Image",
        value: "image",
        description: "Image generation and avatar actions",
        emoji: emojiMap.image,
      },
      {
        label: "Information",
        value: "information",
        description: "Bot, user, and server info",
        emoji: emojiMap.information,
      },
      {
        label: "LeetCode",
        value: "leetcode",
        description: "LeetCode daily challenge tracking",
        emoji: emojiMap.leetcode,
      },
      {
        label: "Moderation",
        value: "moderation",
        description: "Ban, mute, purge, role tools",
        emoji: emojiMap.moderation,
      },
      {
        label: "Music",
        value: "music",
        description: "Play, queue, filters, and controls",
        emoji: emojiMap.music,
      },
      {
        label: "Playlist",
        value: "playlist",
        description: "Saved playlists and queue sharing",
        emoji: emojiMap.playlist,
      },
      {
        label: "Profile",
        value: "profile",
        description: "User biography and custom badges",
        emoji: emojiMap.profile,
      },
      {
        label: "Role",
        value: "role",
        description: "Role setup and voice roles",
        emoji: emojiMap.role,
      },
      {
        label: "Utility",
        value: "utility",
        description: "General server utilities",
        emoji: emojiMap.utility,
      },
      {
        label: "Voice",
        value: "voice",
        description: "Voice channel session management",
        emoji: emojiMap.voice,
      },
      {
        label: "Welcome",
        value: "welcome",
        description: "Join greetings and banner setup",
        emoji: emojiMap.welcome,
      },
    ];

    const dropdownRow = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId("help_select")
        .setPlaceholder("Select a command category")
        .addOptions(commandCategories),
    );

    const msg = await interaction.editReply(v2({
      embeds: [embed],
      components: [dropdownRow],
    }));

    const collector = interaction.channel.createMessageComponentCollector({
      filter: (b) => {
        if (b.user.id === interaction.user.id) return true;
        else
          return b
            .reply(v2({
              content: `${client.emoji.cross} | That's not your session run : \`${prefix}help\` to create your own.`,
              ephemeral: true,
            }))
            .catch(() => {});
      },
      time: 60000 * 5,
      idle: 30e3,
    });

    collector.on("collect", async (i) => {
      if (i.isButton() && i.customId === "home") {
        return i.update(v2({
          embeds: [embed],
          components: [dropdownRow],
        }));
      } else if (i.isStringSelectMenu()) {
        const selectedCategory = i.values[0];
        const categoryCommands = client.commands
          .filter((cmd) => cmd.category?.toLowerCase() === selectedCategory)
          .map((cmd) => `\`${cmd.name}\``);

        const categoryEmbed = new client.embed()
          .d(
            `${
              categoryCommands.join(", ") ||
              "No commands found for this category."
            }`,
          )
          .t(
            `${emojiMap[selectedCategory] || "🎯"} ${
              selectedCategory.charAt(0).toUpperCase() +
              selectedCategory.slice(1)
            } Commands`,
          )
          .setFooter({
            text: `Total ${categoryCommands.length} commands.`,
            iconURL: client.user.displayAvatarURL({ dynamic: true }),
          });

        await i.update(v2({
          embeds: [categoryEmbed],
          components: [dropdownRow, buttonRow],
        }));
      }
    });

    collector.on("end", () => {
      clearComponents(msg);
    });
  },
};
