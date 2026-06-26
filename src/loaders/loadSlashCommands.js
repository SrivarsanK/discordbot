const fs = require("fs");
const path = require("path");
const { normalizePermissions } = require("../utils/permissions");
const { isBotOwner } = require("../utils/owners");

module.exports = (client) => {
  const slashCommandsPath = path.join(__dirname, "../slashCommands");
  const data = [];
  let totalCommands = 0;

  // 1. Load manual slash commands first
  fs.readdirSync(slashCommandsPath).forEach((dir) => {
    const slashCommandFiles = fs
      .readdirSync(path.join(slashCommandsPath, dir))
      .filter((file) => file.endsWith(".js"));
    for (const file of slashCommandFiles) {
      let slashCommand;
      try {
        slashCommand = require(path.join(slashCommandsPath, dir, file));
      } catch (error) {
        client.logger.log(`Skipped slash command with load error: ${dir}/${file} (${error.message})`, "warn");
        continue;
      }

      if (
        !slashCommand.name ||
        !slashCommand.description ||
        typeof slashCommand.run !== "function"
      ) {
        client.logger.log(`Skipped invalid slash command: ${dir}/${file}`, "warn");
        continue;
      }

      slashCommand.botPerms = normalizePermissions(
        slashCommand.botPerms ??
          slashCommand.botPrams ??
          slashCommand.botPermissions ??
          [],
      );
      slashCommand.userPerms = normalizePermissions(
        slashCommand.userPerms ??
          slashCommand.userPrams ??
          slashCommand.userPermissions ??
          [],
      );
      client.slashCommands.set(slashCommand.name, slashCommand);
      data.push({
        name: slashCommand.name,
        description: slashCommand.description,
        options: slashCommand.options || [],
      });
      totalCommands++;
    }
  });

  client.logger.log(`Slash Commands Loaded: ${totalCommands}`, "cmd");

  // 2. Scan all prefix commands and build category slash commands
  const categoriesMap = new Map();

  client.commands.forEach((command) => {
    // Skip if there's already a manual slash command with this exact name
    if (client.slashCommands.has(command.name)) return;

    const categoryName = String(command.category || "other").toLowerCase().replace(/[^a-z0-9_-]/g, "");
    if (!categoriesMap.has(categoryName)) {
      categoriesMap.set(categoryName, []);
    }
    categoriesMap.get(categoryName).push(command);
  });

  let bridgedCount = 0;
  categoriesMap.forEach((commands, categoryName) => {
    const subcommands = commands.map((cmd) => {
      const subName = cmd.name.toLowerCase().replace(/[^a-z0-9_-]/g, "");
      const subOptions = [];
      if (cmd.usage || cmd.args) {
        subOptions.push({
          name: "query",
          description: cmd.usage ? `Args: ${cmd.usage}` : "Arguments for the command",
          type: 3, // String
          required: cmd.args || false,
        });
      }

      return {
        name: subName,
        description: (cmd.description || `Execute prefix command: ${cmd.name}`).slice(0, 100),
        type: 1, // Subcommand
        options: subOptions,
      };
    });

    // Subcommands limit is 25 per Discord specs
    const chunkedSubcommands = subcommands.slice(0, 25);

    const categorySlashCommand = {
      name: categoryName,
      description: `${categoryName.charAt(0).toUpperCase() + categoryName.slice(1)} commands category`,
      options: chunkedSubcommands,
      run: async (client, interaction, prefix) => {
        const subcommandName = interaction.options.getSubcommand();
        const prefixCommand = client.commands.get(subcommandName) || 
          client.commands.find((c) => c.name.toLowerCase() === subcommandName || (c.aliases && c.aliases.map(a => a.toLowerCase()).includes(subcommandName)));

        if (!prefixCommand) {
          return interaction.reply({ content: `Command \`${subcommandName}\` not found.`, ephemeral: true });
        }

        if (prefixCommand.owner && !isBotOwner(client, interaction.user.id)) {
          return interaction.reply({
            content: `Only configured bot owners can use this command.`,
            ephemeral: true,
          });
        }

        // Check user & bot permissions
        const { PermissionsBitField } = require("discord.js");
        if (prefixCommand.botPerms && prefixCommand.botPerms.length > 0) {
          if (!interaction.guild.members.me.permissions.has(PermissionsBitField.resolve(prefixCommand.botPerms))) {
            return interaction.reply({
              content: `I don't have **\`${prefixCommand.botPerms.join(", ")}\`** permission in this server to execute this command.`,
              ephemeral: true,
            });
          }
        }
        if (prefixCommand.userPerms && prefixCommand.userPerms.length > 0) {
          if (!interaction.member.permissions.has(PermissionsBitField.resolve(prefixCommand.userPerms))) {
            return interaction.reply({
              content: `You don't have **\`${prefixCommand.userPerms.join(", ")}\`** permission in this server to execute this command.`,
              ephemeral: true,
            });
          }
        }

        // Check Antinuke/Automod security restrictions
        const isSecurityCommand = prefixCommand.category === "Antinuke" || prefixCommand.category === "Automod";
        if (isSecurityCommand) {
          const AntiNuke = require("../schema/antinuke");
          const antinukeConfig = await AntiNuke.findOne({ guildId: interaction.guildId });
          const extraOwners = antinukeConfig?.extraOwners || [];
          const whitelistRoles = antinukeConfig?.whitelistRoles || [];

          const hasWhitelistedRole = interaction.member.roles.cache.some(role => whitelistRoles.includes(role.id));
          const isAuthorized =
            interaction.user.id === interaction.guild.ownerId ||
            isBotOwner(client, interaction.user.id) ||
            extraOwners.includes(interaction.user.id) ||
            hasWhitelistedRole;

          if (!isAuthorized) {
            return interaction.reply({
              content: `❌ | Only the **server owner**, **extra owners**, or members with **whitelisted roles** can use security commands.`,
              ephemeral: true,
            });
          }
        }

        const player = client.manager.players.get(interaction.guildId);
        if (prefixCommand.player && !player) {
          return interaction.reply({ content: `I'm not in any voice channel!`, ephemeral: true });
        }
        if (prefixCommand.inVoiceChannel && !interaction.member?.voice?.channelId) {
          return interaction.reply({ content: `You must be in a voice channel!`, ephemeral: true });
        }
        if (prefixCommand.sameVoiceChannel && player && interaction.member?.voice?.channelId !== player.voiceId) {
          return interaction.reply({ content: `You must be in the same voice channel as the bot!`, ephemeral: true });
        }

        const queryOption = interaction.options.getString("query") || "";
        const args = queryOption.trim().split(/ +/).filter(Boolean);

        const shimMessage = {
          author: interaction.user,
          member: interaction.member,
          guild: interaction.guild,
          guildId: interaction.guildId,
          channel: Object.assign(Object.create(interaction.channel), {
            send: async (options) => {
              if (typeof options === "string") options = { content: options };
              if (interaction.replied || interaction.deferred) {
                return interaction.followUp(options);
              }
              return interaction.reply({ ...options, fetchReply: true });
            }
          }),
          channelId: interaction.channelId,
          content: `>${prefixCommand.name} ${queryOption}`,
          reply: async (options) => {
            if (typeof options === "string") options = { content: options };
            if (interaction.replied || interaction.deferred) {
              return interaction.followUp(options);
            }
            return interaction.reply({ ...options, fetchReply: true });
          },
          delete: async () => {
            return null;
          },
          react: async () => {
            return null;
          }
        };

        try {
          await prefixCommand.execute(shimMessage, args, client, prefix);
        } catch (error) {
          client.logger?.log(`[Slash Bridge] Command ${prefixCommand.name} failed: ${error.stack || error}`, "error");
          if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: "An error occurred while executing this command.", ephemeral: true }).catch(() => {});
          } else {
            await interaction.followUp({ content: "An error occurred while executing this command.", ephemeral: true }).catch(() => {});
          }
        }
      }
    };

    client.slashCommands.set(categoryName, categorySlashCommand);
    data.push({
      name: categorySlashCommand.name,
      description: categorySlashCommand.description,
      options: categorySlashCommand.options,
    });
    bridgedCount += chunkedSubcommands.length;
  });

  client.logger.log(`Dynamic Slash Commands Loaded: ${bridgedCount} commands mapped to ${categoriesMap.size} category groups`, "cmd");
  client.slashCommandData = data;
};
