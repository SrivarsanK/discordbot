const { v2 } = require("../../utils/v2");
const {
  EmbedBuilder,
  MessageFlags,
  PermissionsBitField,
} = require("discord.js");
const Autoresponder = require("../../schema/ar");

module.exports = {
  name: "autoresponder",
  aliases: ["ar"],
  category: "Extra",
  description:
    "Manage autoresponders with subcommands like add, remove, clear, and config.",
  usage: "<add|remove|clear|config> [arguments]",
  userPerms: ["ManageMessages"],
  args: true,
  cooldown: 3,
  execute: async (message, args, client, prefix) => {
    const subcommand = args[0]?.toLowerCase();
    const guildId = message.guild.id;
      
    switch (subcommand) {
      case "add": {
        if (args.length < 3) {
          const errorEmbed = new client.embed()
            .d(`Usage: \`${prefix}ar add <trigger> <response>\``);
          return message.reply(v2({ embeds: [errorEmbed] }));
        }

        const trigger = args[1];
        const response = args.slice(2).join(" ");

        try {
          const existing = await Autoresponder.findOne({ guildId });
          if (existing) {
            existing.autoresponses.push({ trigger, response });
            await existing.save();
          } else {
            await new Autoresponder({
              guildId,
              autoresponses: [{ trigger, response }],
            }).save();
          }

          const successEmbed = new client.embed()
            .d(
              `✅ Successfully added an autoresponder!\nTrigger: \`${trigger}\`\nResponse: \`${response}\``,
            );

          return message.reply(v2({ embeds: [successEmbed] }));
        } catch (error) {
          console.error(error);
          const errorEmbed = new client.embed()
            .d(
              "An error occurred while adding the autoresponder.",
            );
          return message.reply(v2({ embeds: [errorEmbed] }));
        }
      }

      case "remove": {
        if (args.length < 2) {
          const errorEmbed = new client.embed()
            .d(`Usage: \`${prefix}ar remove <trigger>\``);
          return message.reply(v2({ embeds: [errorEmbed] }));
        }

        const trigger = args[1];

        try {
          const existing = await Autoresponder.findOne({ guildId });
          if (existing) {
            const index = existing.autoresponses.findIndex(
              (ar) => ar.trigger === trigger,
            );
            if (index === -1) {
              const notFoundEmbed = new client.embed()
            .d(
                  `No autoresponder found for trigger: \`${trigger}\``,
                );
              return message.reply(v2({ embeds: [notFoundEmbed] }));
            }

            existing.autoresponses.splice(index, 1);
            await existing.save();

            const successEmbed = new client.embed()
            .d(
                `✅ Successfully removed the autoresponder for trigger: \`${trigger}\``,
              );
            return message.reply(v2({ embeds: [successEmbed] }));
          } else {
            const noDataEmbed = new client.embed()
            .d("No autoresponders set for this server.");
            return message.reply(v2({ embeds: [noDataEmbed] }));
          }
        } catch (error) {
          console.error(error);
          const errorEmbed = new client.embed()
            .d(
              "An error occurred while removing the autoresponder.",
            );
          return message.reply(v2({ embeds: [errorEmbed] }));
        }
      }

      case "clear": {
        try {
          const existing = await Autoresponder.findOne({ guildId });
          if (existing) {
            existing.autoresponses = [];
            await existing.save();

            const successEmbed = new client.embed()
            .d("✅ Successfully cleared all autoresponders.");
            return message.reply(v2({ embeds: [successEmbed] }));
          } else {
            const noDataEmbed = new client.embed()
            .d("No autoresponders set for this server.");
            return message.reply(v2({ embeds: [noDataEmbed] }));
          }
        } catch (error) {
          console.error(error);
          const errorEmbed = new client.embed()
            .d("An error occurred while clearing autoresponders.");
          return message.reply(v2({ embeds: [errorEmbed] }));
        }
      }

      case "config":
      case "list": {
        try {
          const existing = await Autoresponder.findOne({ guildId });
          if (existing && existing.autoresponses.length > 0) {
            const configEmbed = new client.embed()
            .t("Autoresponder Configuration")
              .d(
                existing.autoresponses
                  .map(
                    (ar, i) =>
                      `**${i + 1}. Trigger:** \`${ar.trigger}\`\n**Response:** \`${ar.response}\``,
                  )
                  .join("\n\n"),
              );
            return message.reply(v2({ embeds: [configEmbed] }));
          } else {
            const noDataEmbed = new client.embed()
            .d("No autoresponders set for this server.");
            return message.reply(v2({ embeds: [noDataEmbed] }));
          }
        } catch (error) {
          console.error(error);
          const errorEmbed = new client.embed()
            .d(
              "An error occurred while fetching the configuration.",
            );
          return message.reply(v2({ embeds: [errorEmbed] }));
        }
      }

      default: {
        const errorEmbed = new client.embed()
            .d(
            `Unknown subcommand. Use \`${prefix}ar <add|remove|clear|config>\`.`,
          );
        return message.reply(v2({ embeds: [errorEmbed] }));
      }
    }
  },
};
