const { updateGuildStatsDebounced } = require("../../utils/serverStatsService");

module.exports = {
  name: "guildMemberRemove",
  run: async (client, member) => {
    if (!member || !member.guild) return;
    const { guild } = member;

    // Trigger live server stats update
    updateGuildStatsDebounced(client, guild.id).catch(() => {});
  },
};
