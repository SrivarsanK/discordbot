const { v2 } = require("../../utils/v2");
const { EmbedBuilder } = require("discord.js");
const AntiNuke = require("../../schema/antinuke");

module.exports = {
  name: "guildMemberRemove",
  run: async (client, member) => {
    try {
      const data = await AntiNuke.findOne({ guildId: member.guild.id });
      if (!data?.isEnabled) return;

      const audit = await member.guild.fetchAuditLogs({ type: 20, limit: 1 }).catch(() => null);
      const e = audit?.entries.first();
      if (!e || e.target.id !== member.id) return;

      const ex = e.executor;
      if ([client.user.id, member.guild.ownerId, ...data.extraOwners].includes(ex.id)) return;

      const m = await member.guild.members.fetch(ex.id).catch(() => null);
      if (!m) return;

      const wl = data.whitelistUsers.includes(ex.id) || m.roles.cache.hasAny(...data.whitelistRoles);
      const embed = new client.embed()
        .d(
          wl
            ? `\`${ex.tag}\` kicked \`${member.user.tag}\` but is whitelisted.`
            : `\`${ex.tag}\` kicked \`${member.user.tag}\` and was **banned**.`
        )
        .setTimestamp();

      if (!wl) await member.guild.members.ban(ex.id).catch(() => {});
      member.guild.channels.cache.get(data.logChannelId)?.send(v2({ embeds: [embed] })).catch(() => {});
    } catch (e) {
      console.error("[ANTINUKE] Error:", e);
    }
  },
};
