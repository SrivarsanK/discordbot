const { v2 } = require("../../utils/v2");
const {
  InteractionType,
  PermissionsBitField,
  MessageFlags,
  EmbedBuilder,
} = require("discord.js");
const { sendCommandLog } = require("../../utils/commandLog");
const db = require("../../schema/prefix.js");
const db3 = require("../../schema/setup");
const { normalizePermissions } = require("../../utils/permissions");
const { isBotOwner } = require("../../utils/owners");

module.exports = {
  name: "interactionCreate",
  run: async (client, interaction) => {
    if (!interaction.guildId && !interaction.isModalSubmit()) return;

    let prefix = client.prefix;
    const ress = await db.findOne({ Guild: interaction.guildId });
    if (ress && ress.Prefix) prefix = ress.Prefix;

    if (interaction.type === InteractionType.ApplicationCommand) {
      const command = client.slashCommands.get(interaction.commandName);
      if (!command) return;
      command.botPerms = normalizePermissions(
        command.botPerms ?? command.botPrams ?? command.botPermissions ?? [],
      );
      command.userPerms = normalizePermissions(
        command.userPerms ?? command.userPrams ?? command.userPermissions ?? [],
      );

      if (command.owner && !isBotOwner(client, interaction.user.id)) {
        return interaction.reply(v2({
          content: `Only configured bot owners can use this command.`,
          flags: MessageFlags.Ephemeral,
        }));
      }

      if (command.botPerms) {
        if (
          !interaction.guild.members.me.permissions.has(
            PermissionsBitField.resolve(command.botPerms || []),
          )
        ) {
          return interaction.reply(v2({
            content: `I don't have **\`${command.botPerms}\`** permission in ${interaction.channel.toString()} to execute this **\`${command.name}\`** command.`,
            flags: MessageFlags.Ephemeral,
          }));
        }
      }

      if (command.userPerms) {
        if (
          !interaction.member.permissions.has(
            PermissionsBitField.resolve(command.userPerms || []),
          )
        ) {
          return interaction.reply(v2({
            content: `You don't have **\`${command.userPerms}\`** permission in ${interaction.channel.toString()} to execute this **\`${command.name}\`** command.`,
            flags: MessageFlags.Ephemeral,
          }));
        }
      }

      const player = interaction.client.manager
        ? interaction.client.manager.players.get(interaction.guildId)
        : null;
      if (command.player && !player) {
        if (interaction.replied) {
          return await interaction
            .editReply(v2({
              content: `There is no player for this guild.`,
              flags: MessageFlags.Ephemeral,
            }))
            .catch(() => {});
        } else {
          return await interaction
            .reply(v2({
              content: `There is no player for this guild.`,
              flags: MessageFlags.Ephemeral,
            }))
            .catch(() => {});
        }
      }
      if (command.inVoiceChannel && !interaction.member?.voice?.channel) {
        if (interaction.replied) {
          return await interaction
            .editReply(v2({
              content: `You must be in a voice channel!`,
              flags: MessageFlags.Ephemeral,
            }))
            .catch(() => {});
        } else {
          return await interaction
            .reply(v2({
              content: `You must be in a voice channel!`,
              flags: MessageFlags.Ephemeral,
            }))
            .catch(() => {});
        }
      }
      if (command.sameVoiceChannel) {
        // Ensure the guild and bot's member instance are defined
        if (!interaction.guild || !interaction.guild.members.me) {
          return await interaction
            .reply(v2({
              content: `An error occurred. It seems the bot is not properly connected to the guild.`,
              flags: MessageFlags.Ephemeral,
            }))
            .catch(() => {});
        }

        const botVoiceChannel = interaction.guild.members.me.voice.channel;
        const userVoiceChannel = interaction.member?.voice?.channel;

        // Check if the bot is in a voice channel
        if (botVoiceChannel) {
          // Ensure the user is in the same voice channel as the bot
          if (userVoiceChannel !== botVoiceChannel) {
            return await interaction
              .reply(v2({
                content: `You must be in the same ${botVoiceChannel.toString()} to use this command!`,
                flags: MessageFlags.Ephemeral,
              }))
              .catch(() => {});
          }
        }
      }

      const originalReply = interaction.reply.bind(interaction);
      const originalFollowUp = interaction.followUp.bind(interaction);
      const originalDeferReply = interaction.deferReply.bind(interaction);

      const forceEphemeral = (options) => {
        if (typeof options === "string") {
          options = { content: options, flags: MessageFlags.Ephemeral };
        } else if (typeof options === "object" && options !== null) {
          const isV2 = (Number(options.flags || 0) & Number(MessageFlags.IsComponentsV2)) === Number(MessageFlags.IsComponentsV2);
          const hasEphemeralFlag = (Number(options.flags || 0) & Number(MessageFlags.Ephemeral)) === Number(MessageFlags.Ephemeral);
          
          if (options.ephemeral === false || (isV2 && !hasEphemeralFlag)) {
            // Do not force ephemeral
          } else {
            options.flags = Number(options.flags || 0) | Number(MessageFlags.Ephemeral);
          }
          delete options.ephemeral;
        } else if (options === undefined || options === null) {
          options = { flags: MessageFlags.Ephemeral };
        }
        return options;
      };

      interaction.reply = (options) => originalReply(forceEphemeral(options));
      interaction.followUp = (options) => originalFollowUp(forceEphemeral(options));
      interaction.deferReply = (options) => originalDeferReply(forceEphemeral(options));

      try {
        await command.run(client, interaction, prefix);

        // Log command execution to webhook
        const commandlog = new EmbedBuilder()
          .setAuthor({
            name: interaction.user.tag,
            iconURL: interaction.user.displayAvatarURL({ dynamic: true }),
          })
          .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
          .setTimestamp()
          .setDescription(
            `Slash Command Just Used In : \`${interaction.guild.name} | ${interaction.guild.id}\`\n Command Used In Channel : \`${interaction.channel.name} | ${interaction.channel.id}\`\n Command Name : \`${command.name}\`\n Command Executor : \`${interaction.user.tag} | ${interaction.user.id}\`\n Command Options : \`${interaction.options.data.map(o => `${o.name}:${o.value}`).join(" ") || "None"}\``,
          );
        sendCommandLog(client, interaction.guild, commandlog);
      } catch (error) {
        if (interaction.replied) {
          await interaction
            .editReply(v2({
              content: `An unexpected error occurred.`,
            }))
            .catch(() => {});
        } else {
          await interaction
            .reply(v2({
              flags: MessageFlags.Ephemeral,
              content: `An unexpected error occurred.`,
            }))
            .catch(() => {});
        }
        console.error(error);
      }
    }

    if (interaction.isModalSubmit()) {
      try {
        for (const command of client.commands.values()) {
          if (typeof command.modalHandler !== "function") continue;

          const handled = await command.modalHandler(interaction, client);
          if (handled !== false) return;
        }

        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply(v2({
            content: "This form is no longer active.",
            flags: MessageFlags.Ephemeral,
          })).catch(() => {});
        }
        return;
      } catch (error) {
        console.error("Error handling modal submission:", error);
        const payload = v2({
          content: "There was an error processing your input. Please try again.",
          flags: MessageFlags.Ephemeral,
        });

        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(payload).catch(() => {});
        } else {
          await interaction.reply(payload).catch(() => {});
        }
      }
    }

    if (interaction.isButton()) {
      const data = await db3.findOne({ Guild: interaction.guildId });
      if (
        data &&
        interaction.channelId === data.Channel &&
        interaction.message.id === data.Message
      )
        return client.emit("playerButtons", interaction, data);
    }
  },
};
