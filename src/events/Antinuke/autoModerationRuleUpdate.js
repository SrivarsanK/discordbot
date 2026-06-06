const { v2 } = require("../../utils/v2");
const AntiNuke = require("../../schema/antinuke");

module.exports = {
  name: "autoModerationRuleUpdate",
  run: async (client, oldRule, newRule) => {
    const data = await AntiNuke.findOne({ guildId: oldRule.guild.id });
    if (!data?.isEnabled) return;

    const audit = await oldRule.guild.fetchAuditLogs({
      type: "AUTO_MODERATION_RULE_UPDATE",
      limit: 1,
    }).catch(() => {});
    const entry = audit?.entries?.first();
    if (!entry) return;

    const { executor } = entry;
    if ([oldRule.guild.ownerId, client.user.id, ...data.extraOwners].includes(executor.id)) return;

    const member = await oldRule.guild.members.fetch(executor.id).catch(() => {});
    if (!member) return;

    const isWL = data.whitelistUsers.includes(executor.id) ||
      member.roles.cache.some(r => data.whitelistRoles.includes(r.id));

    const logChannel = oldRule.guild.channels.cache.get(data.logChannelId);
    const emoji = client.emoji;

    if (logChannel) {
      logChannel.send(v2({
        embeds: [
          {
            color: client.color || 0xff0000,
            title: "AutoMod Rule Updated",
            description: `Old: \`${oldRule.name}\`\nNew: \`${newRule.name}\`\nExecutor: **${executor.tag}** (${executor.id})\n${
              isWL
                ? `${emoji.tick} No action taken (Whitelisted)`
                : `${emoji.cross} Executor banned for unauthorized update`
            }`,
            timestamp: new Date(),
          },
        ],
      })).catch(() => {});
    }

    if (!isWL) {
      await oldRule.guild.members.ban(executor.id, {
        reason: "Unauthorized AutoMod rule update",
      }).catch(() => {});
    }
  },
};
