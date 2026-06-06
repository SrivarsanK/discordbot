const { v2 } = require("../../utils/v2");
const AntiNuke = require("../../schema/antinuke");

module.exports = {
  name: "guildMemberAdd",
  run: async (client, member) => {
    try {
      if (!member.user.bot || member.user.verified) return;

      const data = await AntiNuke.findOne({ guildId: member.guild.id });
      if (!data?.isEnabled) return;

      const audit = await member.guild.fetchAuditLogs({ type: 28, limit: 1 }).catch(() => null);
      const entry = audit?.entries?.first();
      if (!entry) return;

      const ex = entry.executor;
      if ([member.guild.ownerId, ...data.extraOwners].includes(ex.id)) return;

      const m = await member.guild.members.fetch(ex.id).catch(() => null);
      if (!m) return;

      const wl = data.whitelistUsers.includes(ex.id) || m.roles.cache.hasAny(...data.whitelistRoles);
      const botWl = data.whitelistUsers.includes(member.id);

      const log = member.guild.channels.cache.get(data.logChannelId);
      let msg;

      if (wl || botWl) {
        msg = `${client.emoji.tick} \`${ex.tag}\` added \`${member.user.tag}\`, but is whitelisted. No action taken.`;
      } else {
        await member.ban({ reason: "Unverified bot added" }).catch(() => {});
        await member.guild.members.ban(ex.id, { reason: "Added unverified bot" }).catch(() => {});
        msg = `${client.emoji.cross} \`${ex.tag}\` added \`${member.user.tag}\`. Both were **banned**.`;
      }

      if (log) {
        log.send(v2({ embeds: [new client.embed().setDescription(msg).setTimestamp()] })).catch(() => {});
      }
    } catch (err) {
      console.error("[ANTINUKE] guildMemberAdd error:", err);
    }
  },
};
