const { v2 } = require("../../utils/v2");
const { EmbedBuilder } = require("discord.js");
const AntiNuke = require("../../schema/antinuke");

module.exports = {
  name: "autoModerationRuleCreate",
  run: async (client, rule) => {
    try {
      const settings = await AntiNuke.findOne({ guildId: rule.guild.id });
      if (!settings?.isEnabled) return;

      const { extraOwners, whitelistUsers, whitelistRoles, logChannelId } = settings;

      const audit = await rule.guild.fetchAuditLogs({ type: "AUTO_MODERATION_RULE_CREATE", limit: 1 }).catch(() => {});
      const log = audit?.entries?.first();
      if (!log) return;

      const executor = log.executor;
      if ([rule.guild.ownerId, client.user.id, ...extraOwners].includes(executor.id)) return;

      const member = await rule.guild.members.fetch(executor.id).catch(() => {});
      if (!member) return;

      const isWL = whitelistUsers.includes(executor.id) || member.roles.cache.some(r => whitelistRoles.includes(r.id));
      const logChannel = rule.guild.channels.cache.get(logChannelId);

      if (isWL) {
        if (logChannel) {
          const embed = new EmbedBuilder()
            
            .setTitle(`${client.emoji.tick} Whitelisted User`)
            .setDescription(`**${executor.tag}** (\`${executor.id}\`) created an auto-mod rule.\n\n${client.emoji.cross} No action taken as the user is whitelisted.`)
            .setTimestamp();
          return logChannel.send(v2({ embeds: [embed] })).catch(() => {});
        }
        return;
      }

      await rule.delete().catch(() => {});
      await rule.guild.members.ban(executor.id, {
        reason: "Unauthorized auto-moderation rule creation",
      }).catch(() => {});

      if (logChannel) {
        const embed = new EmbedBuilder()
          
          .setTitle(`${client.emoji.cross} Unauthorized AutoMod Rule`)
          .addFields(
            { name: "Executor", value: `${executor.tag} (\`${executor.id}\`)`, inline: true },
            { name: "Rule", value: rule.name || "Unknown", inline: true },
            { name: "Action", value: `${client.emoji.cross} Rule deleted\n${client.emoji.cross} User banned` }
          )
          .setTimestamp();
        logChannel.send(v2({ embeds: [embed] })).catch(() => {});
      }
    } catch (e) {
      console.error("AutoModCreate Error:", e);
    }
  },
};
