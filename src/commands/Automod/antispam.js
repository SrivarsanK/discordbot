const { v2 } = require("../../utils/v2");
const {
  EmbedBuilder,
  MessageFlags,
  ButtonBuilder,
  ActionRowBuilder,
  ButtonStyle,
  PermissionsBitField,
  StringSelectMenuBuilder,
} = require("discord.js");
const AntiSpam = require("../../schema/antispam");
const { clearComponents } = require("../../utils/componentCleanup");

module.exports = {
  name: "antispam",
  aliases: ["antis"],
  description: "Enable or disable the Anti-Spam system and manage settings.",
  category: "Automod",
  userPerms: ["ManageGuild"],
  botPerms: ["ManageRoles"],
  cooldown: 3,
  execute: async (message, args, client, prefix) => {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
      return message.reply(v2("You need `Manage Guild` permissions to use this command."));
    }

    const guildId = message.guild.id;

    let antiSpamData = await AntiSpam.findOne({ guildId });
    if (!antiSpamData) {
      antiSpamData = new AntiSpam({ guildId });
      await antiSpamData.save();
    }

    const mainMenuEmbed = new EmbedBuilder()
      .setTitle("Anti-Spam System")
      .setDescription("Choose an option to configure the Anti-Spam system:")
      ;

    const mainMenuRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("toggle").setLabel("Enable/Disable").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId("manage_threshold").setLabel("Set Threshold").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("manage_whitelist").setLabel("Manage Whitelist").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("view_config").setLabel("View Config").setStyle(ButtonStyle.Primary),
    );

    const mainMessage = await message.reply(v2({ embeds: [mainMenuEmbed], components: [mainMenuRow] }));

    const collector = mainMessage.createMessageComponentCollector({ time: 60000 });

    collector.on("collect", async (interaction) => {
      if (interaction.user.id !== message.author.id) {
        return interaction.reply(v2({ content: "This menu is not for you.", flags: MessageFlags.Ephemeral }));
      }

      switch (interaction.customId) {
        case "toggle": {
          antiSpamData.isEnabled = !antiSpamData.isEnabled;
          await antiSpamData.save();

          const toggleEmbed = new EmbedBuilder()
            .setTitle("Anti-Spam System")
            .setDescription(`The Anti-Spam system has been **${antiSpamData.isEnabled ? "enabled" : "disabled"}**.`)
            ;

          await interaction.update(v2({ embeds: [toggleEmbed], components: [] }));
          break;
        }

        case "manage_threshold": {
          const thresholdEmbed = new EmbedBuilder()
            .setTitle("Set Spam Detection Threshold")
            .setDescription("Reply with the **number of messages** and **timeframe (in seconds)**, like:\n`5 10`")
            ;

          await interaction.update(v2({ embeds: [thresholdEmbed], components: [] }));

          const filter = (res) => res.author.id === message.author.id;
          const thresholdCollector = message.channel.createMessageCollector({ filter, time: 30000 });

          thresholdCollector.on("collect", async (res) => {
            const [messages, timeframe] = res.content.trim().split(" ").map(Number);
            if (!messages || !timeframe) {
              return res.reply(v2("Invalid format. Use: `messages timeframe`, e.g. `5 10`."));
            }

            antiSpamData.messageThreshold = messages;
            antiSpamData.timeframe = timeframe;
            await antiSpamData.save();

            await res.reply(v2(`✅ Updated to **${messages} messages** in **${timeframe} seconds**.`));
            thresholdCollector.stop();
          });

          break;
        }

        case "view_config": {
          const whitelistedUsers = antiSpamData.whitelistUsers || [];
          const whitelistedRoles = antiSpamData.whitelistRoles || [];

          const configEmbed = new EmbedBuilder()
            .setTitle("Anti-Spam Configuration")
            
            .addFields(
              {
                name: "System Status",
                value: antiSpamData.isEnabled ? "✅ Enabled" : "❌ Disabled",
              },
              {
                name: "Message Threshold",
                value: `${antiSpamData.messageThreshold || 5} messages in ${antiSpamData.timeframe || 10} seconds`,
              },
              {
                name: "Whitelisted Users",
                value: whitelistedUsers.length ? whitelistedUsers.map((id) => `<@${id}>`).join(", ") : "None",
              },
              {
                name: "Whitelisted Roles",
                value: whitelistedRoles.length ? whitelistedRoles.map((id) => `<@&${id}>`).join(", ") : "None",
              },
            );

          await interaction.update(v2({ embeds: [configEmbed], components: [] }));
          break;
        }

        case "manage_whitelist": {
          const whitelistEmbed = new EmbedBuilder()
            .setTitle("Whitelist Manager")
            .setDescription("Select whether to manage **users** or **roles**.")
            ;

          const whitelistMenu = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
              .setCustomId("whitelist_select")
              .setPlaceholder("Choose a whitelist type...")
              .addOptions(
                {
                  label: "Whitelist User",
                  value: "user",
                  description: "Add or remove users from the whitelist",
                },
                {
                  label: "Whitelist Role",
                  value: "role",
                  description: "Add or remove roles from the whitelist",
                },
              ),
          );

          await interaction.update(v2({ embeds: [whitelistEmbed], components: [whitelistMenu] }));

          const selectCollector = mainMessage.createMessageComponentCollector({
            time: 30000,
            filter: (i) => i.user.id === message.author.id && i.customId === "whitelist_select",
          });

          selectCollector.on("collect", async (select) => {
            const type = select.values[0];
            const promptText =
              type === "user"
                ? "Mention the user(s) you want to **add/remove** from the whitelist."
                : "Mention the role(s) you want to **add/remove** from the whitelist.";

            await select.update(v2({ content: promptText, embeds: [], components: [] }));

            const mentionCollector = message.channel.createMessageCollector({
              filter: (m) => m.author.id === message.author.id,
              time: 30000,
            });

            mentionCollector.on("collect", async (res) => {
              const mentions = type === "user" ? res.mentions.users : res.mentions.roles;

              if (!mentions.size) return res.reply(v2("❌ No valid mentions found."));

              const field = type === "user" ? "whitelistUsers" : "whitelistRoles";
              const currentList = antiSpamData[field] || [];

              mentions.forEach((entity) => {
                const id = entity.id;
                if (currentList.includes(id)) {
                  antiSpamData[field] = currentList.filter((x) => x !== id);
                } else {
                  antiSpamData[field].push(id);
                }
              });

              await antiSpamData.save();

              res.reply(v2(`✅ Whitelist updated for ${type}(s).`));
              mentionCollector.stop();
            });
          });

          break;
        }
      }
    });

    collector.on("end", () => {
      clearComponents(mainMessage);
    });
  },
};
