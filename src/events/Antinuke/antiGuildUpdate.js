const { v2 } = require("../../utils/v2");
const { EmbedBuilder } = require("discord.js");
const AntiNuke = require("../../schema/antinuke");

module.exports = {
  name: "guildUpdate",
  run: async (client, oldGuild) => {
    try {
      const data = await AntiNuke.findOne({ guildId: oldGuild.id });
      if (!data?.isEnabled) return;

      const audit = await oldGuild.fetchAuditLogs({ type: 1, limit: 1 }).catch(() => null);
      const entry = audit?.entries?.first();
      const ex = entry?.executor;
      if (!ex || [oldGuild.ownerId, client.user.id, ...data.extraOwners].includes(ex.id)) return;

      const member = await oldGuild.members.fetch(ex.id).catch(() => null);
      if (!member) return;

      const isWhitelisted =
        data.whitelistUsers.includes(ex.id) ||
        member.roles.cache.some(r => data.whitelistRoles.includes(r.id));

      const log = oldGuild.channels.cache.get(data.logChannelId);
      if (!log) return;

      const embed = new EmbedBuilder().setTimestamp();

      if (isWhitelisted) {
        embed
          .setTitle("Whitelisted Guild Update")
          .setDescription(`**${ex.tag}** (${ex.id}) updated the server.\nNo action taken as they are whitelisted.`);
      } else {
        await entry.target?.delete?.().catch(() => {});
        await member.ban({ reason: "Unauthorized guild update" }).catch(() => {});
        embed
          .setTitle("Unauthorized Guild Update")
          .setDescription(`**${ex.tag}** (${ex.id}) made changes and was **banned**.`)
          .addFields({ name: "Action", value: "Changes reverted & Banned" });
      }

      log.send(v2({ embeds: [embed] })).catch(() => {});
    } catch (err) {
      console.error("[ANTINUKE] guildUpdate error:", err);
    }
  },
};
