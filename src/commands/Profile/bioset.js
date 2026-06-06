const { v2 } = require("../../utils/v2");
const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require("discord.js");
const Profile = require("../../schema/profile");

const SOCIAL_PLATFORMS = ["twitter", "instagram", "discord"];

module.exports = {
  name: "bioset",
  aliases: ["profileedit", "bioedit", "bio"],
  category: "Profile",
  cooldown: 5,
  description: "Edit your bio or social media links.",
  args: false,
  usage: "",
  botPerms: ["EmbedLinks"],
  userPerms: [],
  owner: false,
  execute: async (message, args, client) => {
    const user = message.author;

    await Profile.updateOne(
      { User: user.id },
      { $setOnInsert: { Bio: "", SocialMedia: {} } },
      { upsert: true },
    );

    const embed = new EmbedBuilder()
      .setTitle("Profile Editor")
      .setDescription("Choose what you want to update.")
      .setFooter({
        text: "Profile Editor | Expires in 1 minute",
        iconURL: client.user.displayAvatarURL(),
      });

    const mainRow = buildMainRow(user.id);
    const msg = await message.reply(v2({ embeds: [embed], components: [mainRow] }));
    const collector = msg.createMessageComponentCollector({ time: 60000 });

    collector.on("collect", async (interaction) => {
      if (interaction.user.id !== user.id) {
        return interaction.reply(v2({
          content: "This profile editor is not for you.",
          ephemeral: true,
        }));
      }

      try {
        if (interaction.customId === customId("bio", user.id)) {
          return interaction.showModal(buildBioModal(user.id));
        }

        if (interaction.customId === customId("social", user.id)) {
          return interaction.update(v2({
            content: "Select a social media platform to update.",
            embeds: [],
            components: [buildSocialRow(user.id)],
          }));
        }

        if (interaction.customId === customId("reset", user.id)) {
          await Profile.updateOne(
            { User: user.id },
            { $set: { Bio: "", SocialMedia: {} } },
            { upsert: true },
          );

          return interaction.update(v2({
            content: `${client.emoji.tick || ""} Your profile has been reset.`.trim(),
            embeds: [],
            components: [],
          }));
        }

        if (interaction.customId === customId("back", user.id)) {
          return interaction.update(v2({
            embeds: [embed],
            components: [mainRow],
          }));
        }

        for (const platform of SOCIAL_PLATFORMS) {
          if (interaction.customId === customId(`social:${platform}`, user.id)) {
            return interaction.showModal(buildSocialModal(platform, user.id));
          }
        }
      } catch (error) {
        console.error("Error handling profile interaction:", error);
        return replySafely(interaction, {
          content: `${client.emoji.cross || ""} Something went wrong while updating your profile.`.trim(),
          ephemeral: true,
        });
      }
    });

    collector.on("end", () => {
      msg.edit(v2({ components: [buildMainRow(user.id, true)] })).catch(() => {});
    });
  },

  modalHandler: async (interaction) => {
    if (!interaction.customId.startsWith("profile:")) return false;

    try {
      const parts = interaction.customId.split(":");
      const modalType = parts[1];
      const ownerId = parts.at(-1);

      if (ownerId !== interaction.user.id) {
        await interaction.reply(v2({
          content: "This profile modal is not for you.",
          ephemeral: true,
        }));
        return true;
      }

      if (modalType === "bio-modal") {
        const newBio = interaction.fields.getTextInputValue("bioInput").trim();
        if (!newBio) {
          await interaction.reply(v2({
            content: "Bio cannot be empty.",
            ephemeral: true,
          }));
          return true;
        }

        await Profile.updateOne(
          { User: interaction.user.id },
          { $set: { Bio: newBio }, $setOnInsert: { SocialMedia: {} } },
          { upsert: true },
        );

        await interaction.reply(v2({
          content: "Your bio has been updated.",
          ephemeral: true,
        }));
        return true;
      }

      if (modalType === "social-modal") {
        const platform = parts[2];
        if (!SOCIAL_PLATFORMS.includes(platform)) return false;

        const link = interaction.fields.getTextInputValue(`${platform}Link`).trim();
        const username = interaction.fields.getTextInputValue(`${platform}Username`).trim();

        if (!link || !username) {
          await interaction.reply(v2({
            content: "Both username and link are required.",
            ephemeral: true,
          }));
          return true;
        }

        await Profile.updateOne(
          { User: interaction.user.id },
          {
            $set: {
              [`SocialMedia.${platform}.link`]: link,
              [`SocialMedia.${platform}.username`]: username,
            },
            $setOnInsert: { Bio: "" },
          },
          { upsert: true },
        );

        await interaction.reply(v2({
          content: `Your ${platform} profile has been updated.`,
          ephemeral: true,
        }));
        return true;
      }
    } catch (error) {
      console.error("Error handling profile modal submission:", error);
      await replySafely(interaction, {
        content: "Something went wrong while saving your profile.",
        ephemeral: true,
      });
      return true;
    }

    return false;
  },
};

function customId(action, userId) {
  return `profile:${action}:${userId}`;
}

function buildMainRow(userId, disabled = false) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(customId("bio", userId))
      .setLabel("Edit Bio")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(disabled),
    new ButtonBuilder()
      .setCustomId(customId("social", userId))
      .setLabel("Edit Socials")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(disabled),
    new ButtonBuilder()
      .setCustomId(customId("reset", userId))
      .setLabel("Reset")
      .setStyle(ButtonStyle.Danger)
      .setDisabled(disabled),
  );
}

function buildSocialRow(userId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(customId("social:twitter", userId))
      .setLabel("Twitter")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(customId("social:instagram", userId))
      .setLabel("Instagram")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(customId("social:discord", userId))
      .setLabel("Discord")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(customId("back", userId))
      .setLabel("Back")
      .setStyle(ButtonStyle.Primary),
  );
}

function buildBioModal(userId) {
  return new ModalBuilder()
    .setCustomId(customId("bio-modal", userId))
    .setTitle("Edit Your Bio")
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("bioInput")
          .setLabel("Enter your new bio")
          .setStyle(TextInputStyle.Paragraph)
          .setMaxLength(200)
          .setRequired(true),
      ),
    );
}

function buildSocialModal(platform, userId) {
  const label = platform.charAt(0).toUpperCase() + platform.slice(1);

  return new ModalBuilder()
    .setCustomId(customId(`social-modal:${platform}`, userId))
    .setTitle(`Edit ${label}`)
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId(`${platform}Link`)
          .setLabel(`${label} profile link`)
          .setStyle(TextInputStyle.Short)
          .setPlaceholder(`https://${platform}.com/yourprofile`)
          .setRequired(true)
          .setMaxLength(200),
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId(`${platform}Username`)
          .setLabel(`${label} username`)
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMaxLength(50),
      ),
    );
}

async function replySafely(interaction, payload) {
  if (interaction.replied || interaction.deferred) {
    return interaction.followUp(v2(payload)).catch(() => {});
  }

  return interaction.reply(v2(payload)).catch(() => {});
}
