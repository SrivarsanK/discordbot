/** @format */

const { v2 } = require("../../utils/v2");

const {
  MessageFlags,
  ActionRowBuilder,
  StringSelectMenuBuilder,
} = require("discord.js");

module.exports = {
  name: "filter",
  category: "Music",
  aliases: ["eq", "filters"],
  cooldown: 3,
  description: "Sets the bot's sound filter.",
  args: false,
  usage: "",
  userPerms: [],
  player: true,
  inVoiceChannel: true,
  sameVoiceChannel: true,
  execute: async (message, args, client, prefix) => {
    const player = client.manager.players.get(message.guild.id);
    const embed = new client.embed().setAuthor({
      name: `Choose Filters From below!`,
      iconURL: message.member.displayAvatarURL({ dynamic: true }),
    });
    // .setFooter({text:`Thx For Using Me`, iconURL: client.user.displayAvatarURL({dynamic:true})})
    // .d(`${client.emoji.dot} Reset Filters\n${client.emoji.dot} Bass Booster\n${client.emoji.dot} 8D\n${client.emoji.dot} Nightcore\n${client.emoji.dot} Pitch\n${client.emoji.dot} Distort\n${client.emoji.dot} Equalizer\n${client.emoji.dot} Speed\n${client.emoji.dot} Vaporwave`)

    const row4 = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId("disable_h")
        .setPlaceholder(`Select Filters`)
        .addOptions([
          { label: "Reset Filters", value: "clear", emoji: client.emoji.dot },
          { label: "BassBoost", value: "bass_but", emoji: client.emoji.dot },
          { label: "8D", value: "8d_but", emoji: client.emoji.dot },
          { label: "NightCore", value: "night_but", emoji: client.emoji.dot },
          { label: "Pitch", value: "pitch_but", emoji: client.emoji.dot },
          { label: "Distort", value: "distort_but", emoji: client.emoji.dot },
          { label: "Equalizer", value: "eq_but", emoji: client.emoji.dot },
          { label: "Speed", value: "speed_but", emoji: client.emoji.dot },
          { label: "Vaporwave", value: "vapo_but", emoji: client.emoji.dot },
        ]),
    );

    const eq = await message.channel.send(v2({
      embeds: [embed],
      components: [row4],
    }));

    const collector = await eq.createMessageComponentCollector({
      filter: (i) => {
        if (message.author.id === i.user.id) return true;
        else {
          i.reply(v2({
            content: `${client.emoji.cross} | That's not your session run : \`${prefix}filter\` to create your own.`,
            ephemeral: true,
          }));
        }
      },
      time: 100000,
    });

    collector.on("collect", async (i) => {
      if (i.isStringSelectMenu()) {
        for (const value of i.values) {
          if (value === "clear") {
            player.shoukaku.clearFilters();
            return i.reply(v2({
              content: `${client.emoji.tick} Succesfully Cleared All **FILTERS**`,
              flags: MessageFlags.Ephemeral,
            }));
          }
          if (value === "bass_but") {
            await player.shoukaku.setFilters({
              op: "filters",
              guildId: message.guild.id,
              equalizer: [
                { band: 0, gain: 0.1 },
                { band: 1, gain: 0.1 },
                { band: 2, gain: 0.05 },
                { band: 3, gain: 0.05 },
                { band: 4, gain: -0.05 },
                { band: 5, gain: -0.05 },
                { band: 6, gain: 0 },
                { band: 7, gain: -0.05 },
                { band: 8, gain: -0.05 },
                { band: 9, gain: 0 },
                { band: 10, gain: 0.05 },
                { band: 11, gain: 0.05 },
                { band: 12, gain: 0.1 },
                { band: 13, gain: 0.1 },
              ],
            });
            await i.reply(v2({
              flags: MessageFlags.Ephemeral,
              content: `${client.emoji.tick} BassBoost mode **ENABLED**`,
            }));
          }
          if (value === "8d_but") {
            await player.shoukaku.setFilters({
              op: "filters",
              guildId: message.guild.id,
              rotation: { rotationHz: 0.2 },
            });
            await i.reply(v2({
              ephemeral: false,
              content: `${client.emoji.tick} 8D Mode **ENABLED**`,
              flags: MessageFlags.Ephemeral,
            }));
          }
          if (value === "night_but") {
            await player.shoukaku.setFilters({
              op: "filters",
              guildId: message.guild.id,
              equalizer: [
                { band: 1, gain: 0.3 },
                { band: 0, gain: 0.3 },
              ],
              timescale: { pitch: 1.2 },
              tremolo: { depth: 0.3, frequency: 14 },
            });
            i.reply(v2({
              content: `${client.emoji.tick} NightCore Mode **ENABLED**`,
              flags: MessageFlags.Ephemeral,
            }));
          }
          if (value === "pitch_but") {
            await player.shoukaku.setFilters({
              op: "filters",
              guildId: message.guild.id,
              timescale: {
                pitch: 1.245,
                rate: 1.921,
              },
            });
            i.reply(v2({
              content: `${client.emoji.tick} Pitch Mode **ENABLED**`,
              flags: MessageFlags.Ephemeral,
            }));
          }
          if (value === "distort_but") {
            await player.shoukaku.setFilters({
              op: "filters",
              guildId: message.guild.id,
              equalizer: [
                { band: 0, gain: 0.5 }, // Boosting lower frequencies significantly
                { band: 1, gain: 0.5 },
                { band: 2, gain: 0.3 },
                { band: 3, gain: 0.3 },
                { band: 4, gain: 0.2 },
                { band: 5, gain: 0.2 },
                { band: 6, gain: 0.1 },
                { band: 7, gain: 0.1 },
                { band: 8, gain: 0 },
                { band: 9, gain: 0 },
                { band: 10, gain: -0.1 }, // Slightly reducing some higher frequencies
                { band: 11, gain: -0.1 },
                { band: 12, gain: -0.2 },
                { band: 13, gain: -0.2 },
              ],
            });

            i.reply(v2({
              flags: MessageFlags.Ephemeral,
              content: `${client.emoji.tick} Distort Mode **ENABLED**`,
            }));
          }
          if (value === "speed_but") {
            await player.shoukaku.setFilters({
              op: "filters",
              guildId: message.guild.id,
              timescale: {
                speed: 1.501,
                pitch: 1.245,
                rate: 1.921,
              },
            });
            i.reply(v2({
              flags: MessageFlags.Ephemeral,
              content: `${client.emoji.tick} Speed Mode **ENABLED**`,
            }));
          }
          if (value === "vapo_but") {
            await player.shoukaku.setFilters({
              op: "filters",
              guildId: message.guild.id,
              equalizer: [
                { band: 1, gain: 0.3 },
                { band: 0, gain: 0.3 },
              ],
              timescale: { pitch: 0.5 },
              tremolo: { depth: 0.3, frequency: 14 },
            });
            i.reply(v2({
              flags: MessageFlags.Ephemeral,
              content: `${client.emoji.tick} VaporWave Mode **ENABLED**`,
            }));
          }
          if (value === "lofi_but") {
            await player.shoukaku.setFilters({
              op: "filters",
              guildId: message.guild.id,
              equalizer: [
                { band: 0, gain: -0.25 },
                { band: 1, gain: -0.25 },
                { band: 2, gain: -0.15 },
                { band: 3, gain: -0.1 },
                { band: 4, gain: -0.05 },
                { band: 5, gain: 0 },
                { band: 6, gain: 0 },
                { band: 7, gain: 0 },
                { band: 8, gain: 0 },
                { band: 9, gain: 0.05 },
                { band: 10, gain: 0.1 },
                { band: 11, gain: 0.15 },
                { band: 12, gain: 0.2 },
                { band: 13, gain: 0.25 },
              ],
            });

            i.reply(v2({
              flags: MessageFlags.Ephemeral,
              content: `${client.emoji.tick} Lofi Mode **ENABLED**`,
            }));
          }
        }
      }
    });
  },
};
