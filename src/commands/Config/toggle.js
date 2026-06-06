const { v2 } = require("../../utils/v2");
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const VcStatus = require("../../schema/vcstatus");
const db = require("../../schema/247");
const { clearComponents } = require("../../utils/componentCleanup");

module.exports = {
  name: "toggle",
  category: "Config",
  description: "Enable or disable VC status system or toggle 24/7 mode.",
  args: true,
  usage: "<vcstatus | 247>",
  userPrams: ["ManageGuild"],
  botPrams: ["ManageGuild"],
  owner: false,
  voteonly: false,
  cooldown: 3,

  execute: async (message, args, client, prefix) => {

    const option = args[0]?.toLowerCase();
    if (!option || !["vcstatus", "247"].includes(option)) {
      return message.reply(v2("⚠️ Usage: `toggle <vcstatus | 247>`"));
    }

    let embed = new client.embed();
    let row;
    let status;

    if (option === "vcstatus") {
      const guildId = message.guild.id;
      const existing = await VcStatus.findOne({ guildId });
      status = existing ? "enabled" : "disabled";

      embed.setAuthor({ name: `VC Status is currently ${status.toUpperCase()}` });

      row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("toggle_vcstatus")
          .setLabel(existing ? "Disable" : "Enable")
          .setStyle(existing ? ButtonStyle.Danger : ButtonStyle.Success)
      );
    } else if (option === "247") {
      const player = client.manager.players.get(message.guild.id);
      if (!player) return message.reply(v2("⚠️ There is no active player in this server."));

      let data = await db.findOne({ Guild: message.guild.id });
      status = data ? "enabled" : "disabled";

      embed.setAuthor({ name: `24/7 Mode is currently ${status.toUpperCase()}` });

      row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("toggle_247")
          .setLabel(data ? "Disable" : "Enable")
          .setStyle(data ? ButtonStyle.Danger : ButtonStyle.Success)
      );
    }

    const msg = await message.reply(v2({ embeds: [embed], components: [row] }));

    // Create Collector
    const collector = msg.createMessageComponentCollector({
      filter: (interaction) => interaction.user.id === message.author.id,
      time: 60000, // 1 minute
    });

    collector.on("collect", async (interaction) => {
      if (!interaction.isButton()) return;

      let newStatus;
      let updatedEmbed = new client.embed();

      if (interaction.customId === "toggle_vcstatus") {
        const guildId = message.guild.id;
        let existing = await VcStatus.findOne({ guildId });

        if (existing) {
          await VcStatus.deleteOne({ guildId });
          newStatus = "disabled";
        } else {
          await VcStatus.create({ guildId });
          newStatus = "enabled";
        }

        updatedEmbed.setAuthor({ name: `VC Status is now ${newStatus.toUpperCase()}` });
      } else if (interaction.customId === "toggle_247") {
        let data = await db.findOne({ Guild: message.guild.id });

        if (data) {
          await data.deleteOne();
          newStatus = "disabled";
        } else {
          const player = client.manager.players.get(message.guild.id);
          if (!player) return interaction.reply(v2({ content: "⚠️ No active player found.", ephemeral: true }));

          data = new db({
            Guild: player.guildId,
            TextId: player.textId,
            VoiceId: player.voiceId,
          });
          await data.save();
          newStatus = "enabled";
        }

        updatedEmbed.setAuthor({ name: `24/7 Mode is now ${newStatus.toUpperCase()}` });
      }

      await interaction.update(v2({ embeds: [updatedEmbed], components: [] }));
      collector.stop();
    });

    collector.on("end", () => {
      clearComponents(msg);
    });
  },
};
