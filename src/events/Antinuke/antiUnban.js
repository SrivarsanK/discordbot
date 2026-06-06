const { v2 } = require("../../utils/v2");
const AntiNuke = require("../../schema/antinuke");

module.exports = {
  name: "guildBanRemove",
  run: async (client, ban) => {
    try {
      const data = await AntiNuke.findOne({ guildId: ban.guild.id });
      if (!data?.isEnabled) return;

      const audit = await ban.guild.fetchAuditLogs({ type: 23, limit: 1 }).catch(() => null);
      const e = audit?.entries.first();
      if (!e) return;

      const ex = e.executor;
      if ([client.user.id, ban.guild.ownerId, ...data.extraOwners].includes(ex.id)) return;

      const m = await ban.guild.members.fetch(ex.id).catch(() => null);
      if (!m) return;

      const wl = data.whitelistUsers.includes(ex.id) || m.roles.cache.hasAny(...data.whitelistRoles);

      const msg = wl
        ? `${client.emoji.tick} \`${ex.tag}\` unbanned \`${e.target.tag}\` but is whitelisted.`
        : `${client.emoji.cross} \`${ex.tag}\` unbanned \`${e.target.tag}\` and was **banned**.`;

      if (!wl) await ban.guild.members.ban(ex.id).catch(() => {});

      ban.guild.channels.cache.get(data.logChannelId)?.send(v2({
        embeds: [client.embed().setDescription(msg).setTimestamp()],
      })).catch(() => {});
    } catch (err) {
      console.error("[ANTINUKE] guildBanRemove error:", err);
    }
  },
};
