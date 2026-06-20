/** @format */

const { EmbedBuilder, ApplicationCommandOptionType } = require("discord.js");
const { v2 } = require("../../utils/v2");
const LeetcodeUsers = require("../../schema/leetcodeUsers");

module.exports = {
  name: "unbind",
  description: "Unlink a user's LeetCode account (Admin only)",
  userPrams: ["ManageGuild"],
  options: [
    {
      name: "user",
      description: "The Discord user to unlink",
      type: ApplicationCommandOptionType.User,
      required: true,
    }
  ],

  run: async (client, interaction) => {
    await interaction.deferReply();
    const targetUser = interaction.options.getUser("user");

    // Remove binding
    const existing = await LeetcodeUsers.findOne({ discordId: targetUser.id });
    if (!existing) {
      return interaction.editReply(v2({
        embeds: [
          new EmbedBuilder()
            .setDescription(`❌ User **${targetUser.tag}** does not have a linked LeetCode account.`)
            .setColor("#ED4245")
        ]
      }));
    }

    await LeetcodeUsers.deleteOne({ discordId: targetUser.id });

    const embed = new EmbedBuilder()
      .setDescription(`✅ Successfully unlinked LeetCode username **${existing.lcUsername}** from Discord account **${targetUser.tag}**.`)
      .setColor("#57F287");

    interaction.editReply(v2({ embeds: [embed] }));
  },
};
