const { v2 } = require("../../utils/v2");
const {
  InteractionType,
  PermissionsBitField,
  MessageFlags,
} = require("discord.js");
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

      const player = interaction.client.manager.players.get(
        interaction.guildId,
      );
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
      if (command.inVoiceChannel && !interaction.member.voice.channel) {
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
        const userVoiceChannel = interaction.member.voice.channel;

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

      try {
        await command.run(client, interaction, prefix);
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
