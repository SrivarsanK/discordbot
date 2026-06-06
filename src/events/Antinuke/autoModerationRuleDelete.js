const { v2 } = require("../../utils/v2");
const AntiNuke = require("../../schema/antinuke");

module.exports = {
  name: "autoModerationRuleDelete",
  run: async (client, rule) => {
    const data = await AntiNuke.findOne({ guildId: rule.guild.id });
    if (!data?.isEnabled) return;

    const audit = await rule.guild.fetchAuditLogs({ type: "AUTO_MODERATION_RULE_DELETE", limit: 1 }).catch(() => {});
    const entry = audit?.entries?.first();
    if (!entry) return;

    const { executor } = entry;
    if ([rule.guild.ownerId, client.user.id, ...data.extraOwners].includes(executor.id)) return;

    const member = await rule.guild.members.fetch(executor.id).catch(() => {});
    if (!member) return;

    const isWL = data.whitelistUsers.includes(executor.id) || member.roles.cache.some(r => data.whitelistRoles.includes(r.id));
    const logChannel = rule.guild.channels.cache.get(data.logChannelId);
    const emoji = client.emoji;

    if (logChannel) {
      logChannel.send(v2({
        embeds: [
          {
            color: client.color || 0xff0000,
            title: "AutoMod Rule Deleted",
            description: `Rule: \`${rule.name}\`\nExecutor: **${executor.tag}** (${executor.id})\n${
              isWL
                ? `${emoji.tick} No action taken (User is whitelisted)`
                : `${emoji.cross} Executor banned for unauthorized deletion`
            }`,
            timestamp: new Date(),
          },
        ],
      })).catch(() => {});
    }

    if (!isWL) {
      await rule.guild.members.ban(executor.id, { reason: "Unauthorized AutoMod rule deletion" }).catch(() => {});
    }
  },
};
