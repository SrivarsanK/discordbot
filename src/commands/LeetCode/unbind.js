/** @format */

const { EmbedBuilder } = require("discord.js");
const { v2 } = require("../../utils/v2");
const LeetcodeUsers = require("../../schema/leetcodeUsers");

module.exports = {
  name: "unbind",
  category: "LeetCode",
  aliases: ["lcunbind"],
  cooldown: 3,
  description: "Unlink a user's LeetCode account (Admin only)",
  args: true,
  usage: "<@user|user_id>",
  userPerms: ["ManageGuild"],
  botPerms: [],
  owner: false,

  execute: async (message, args, client) => {
    // 1. Resolve user
    const targetUser = message.mentions.users.first() || 
                       await client.users.fetch(args[0]).catch(() => null);

    if (!targetUser) {
      return message.channel.send(v2({
        embeds: [
          new EmbedBuilder()
            .setDescription("❌ Please mention a valid member or provide a valid user ID.")
            .setColor("#ED4245")
        ]
      }));
    }

    // 2. Remove binding
    const existing = await LeetcodeUsers.findOne({ discordId: targetUser.id });
    if (!existing) {
      return message.channel.send(v2({
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

    message.channel.send(v2({ embeds: [embed] }));
  },
};
