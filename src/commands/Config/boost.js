const { v2 } = require("../../utils/v2");
const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} = require("discord.js");
const Premium = require("../../schema/premium");
const { clearComponents } = require("../../utils/componentCleanup");

module.exports = {
  name: "boost",
  description: "Use your personal premium to boost this server.",
  category: "Config",
  args: false,
  usage: "boost",
  userPerms: [],
  owner: false,
  execute: async (message, args, client) => {
    const userPremium = await Premium.findOne({
      id: message.author.id,
      type: "user",
    });

    if (!userPremium?.isActive()) {
      return message.reply(v2({
        embeds: [
          new EmbedBuilder()
            .setTitle("Premium Required")
            .setDescription("You need active personal premium to boost this server."),
        ],
      }));
    }

    const guildPremium = await Premium.findOne({
      id: message.guild.id,
      type: "guild",
    });

    if (guildPremium?.isActive() && guildPremium.addedBy !== message.author.id) {
      return message.reply(v2({
        embeds: [
          new EmbedBuilder()
            .setTitle("Already Boosted")
            .setDescription("This server already has active premium from another user."),
        ],
      }));
    }

    if (guildPremium?.isActive() && guildPremium.addedBy === message.author.id) {
      return confirmRemoveBoost(message, guildPremium);
    }

    return confirmAddBoost(message, client, userPremium);
  },
};

async function confirmAddBoost(message, client, userPremium) {
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("boost-confirm")
      .setLabel("Boost")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId("boost-cancel")
      .setLabel("Cancel")
      .setStyle(ButtonStyle.Secondary),
  );

  const prompt = await message.reply(v2({
    embeds: [
      new EmbedBuilder()
        .setTitle("Boost Server")
        .setDescription(`Use your **${userPremium.tier}** premium on **${message.guild.name}**?`),
    ],
    components: [row],
  }));

  const collector = prompt.createMessageComponentCollector({
    filter: (interaction) => interaction.user.id === message.author.id,
    time: 30000,
    max: 1,
  });

  collector.on("collect", async (interaction) => {
    if (interaction.customId === "boost-cancel") {
      return interaction.update(v2({
        embeds: [
          new EmbedBuilder()
            .setTitle("Boost Cancelled")
            .setDescription("No changes were made."),
        ],
        components: [],
      }));
    }

    await Premium.findOneAndUpdate(
      { id: message.guild.id, type: "guild" },
      {
        id: message.guild.id,
        type: "guild",
        tier: userPremium.tier,
        addedBy: message.author.id,
        expiresAt: userPremium.expiresAt,
        features: userPremium.features,
        note: `Boosted by ${message.author.tag}`,
      },
      { upsert: true, new: true },
    );

    return interaction.update(v2({
      embeds: [
        new EmbedBuilder()
          .setTitle("Server Boosted")
          .setDescription(`${client.emoji.tick || "Done"} **${message.guild.name}** now has **${userPremium.tier}** premium.`),
      ],
      components: [],
    }));
  });

  collector.on("end", (collected) => {
    if (collected.size) return;
    clearComponents(prompt);
  });
}

async function confirmRemoveBoost(message, guildPremium) {
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("boost-remove")
      .setLabel("Remove")
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId("boost-keep")
      .setLabel("Keep")
      .setStyle(ButtonStyle.Secondary),
  );

  const prompt = await message.reply(v2({
    embeds: [
      new EmbedBuilder()
        .setTitle("Remove Boost?")
        .setDescription("You already boosted this server. Remove your boost?"),
    ],
    components: [row],
  }));

  const collector = prompt.createMessageComponentCollector({
    filter: (interaction) => interaction.user.id === message.author.id,
    time: 30000,
    max: 1,
  });

  collector.on("collect", async (interaction) => {
    if (interaction.customId === "boost-keep") {
      return interaction.update(v2({
        embeds: [
          new EmbedBuilder()
            .setTitle("Boost Kept")
            .setDescription("No changes were made."),
        ],
        components: [],
      }));
    }

    await guildPremium.deleteOne();
    return interaction.update(v2({
      embeds: [
        new EmbedBuilder()
          .setTitle("Boost Removed")
          .setDescription("Server premium boost removed."),
      ],
      components: [],
    }));
  });

  collector.on("end", (collected) => {
    if (collected.size) return;
    clearComponents(prompt);
  });
}
