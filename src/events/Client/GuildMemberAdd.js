const { EmbedBuilder } = require("discord.js");
const { getSettings } = require("../../schema/welcomesystem");

module.exports = {
  name: "guildMemberAdd",
  run: async (client, member) => {
    if (!member || !member.guild) return;
    const { guild } = member;
    const settings = await getSettings(guild);
    if (!settings.welcome.enabled) return;
    client.util.sendWelcome(member, settings);
  },
};
