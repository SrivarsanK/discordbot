const { v2 } = require("../../utils/v2");
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
} = require("discord.js");
const Preset = require("../../schema/preset");
const { clearComponents } = require("../../utils/componentCleanup");

module.exports = {
  name: "preset",
  aliases: ["preset"],
  category: "Config",
  args: false,
  execute: async (message, args, client, prefix) => {
    const presets = ["1", "2", "3", "4"];

    const embed = new EmbedBuilder()
      .setDescription("> Select a preset from the menu below!")
      ;

    const selectMenu = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId("preset_menu")
        .setPlaceholder("Choose a preset")
        .addOptions(
          presets.map((key) => ({
            label: `Preset ${key}`,
            value: key,
            description: "Music card layout",
          }))
        )
    );

    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("save_preset")
        .setLabel("Save Current")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId("reset_preset")
        .setLabel("Reset to Default")
        .setStyle(ButtonStyle.Danger)
    );

    const presetMessage = await message.channel.send(v2({
      embeds: [embed],
      components: [selectMenu, buttons],
    }));

    let selectedPreset = null;

    const collector = presetMessage.createMessageComponentCollector({
      filter: (i) => i.user.id === message.author.id,
      time: 60000,
    });

    collector.on("collect", async (i) => {
      if (i.isStringSelectMenu()) {
        selectedPreset = i.values[0];

        const presetEmbed = new EmbedBuilder()
          .setTitle(`Preset ${selectedPreset}`)
          
          .setDescription(`Preset **${selectedPreset}** selected.`);

        return i.update(v2({
          embeds: [presetEmbed],
          components: [selectMenu, buttons],
        }));
      }

      if (i.isButton()) {
        if (i.customId === "save_preset") {
          if (!selectedPreset) {
            return i.reply(v2({
              content: "⚠️ Please select a preset before saving!",
              ephemeral: true,
            }));
          }

          await Preset.updateOne(
            { guildId: message.guild.id },
            { $set: { presetType: parseInt(selectedPreset) } }, 
            { upsert: true }
          );

          return i.reply(v2({
            content: `✅ Preset **${selectedPreset}** has been saved!`,
            ephemeral: true,
          }));
        }

        if (i.customId === "reset_preset") {
          await Preset.deleteMany({ guildId: message.guild.id });

          return i.reply(v2({
            content: `🔄 Preset has been reset to **Default**!`,
            ephemeral: true,
          }));
        }
      }
    });

    collector.on("end", async () => {
      await clearComponents(presetMessage);
    });
  },
};
