const AutoRole = require("../../schema/autorole");

module.exports = {
  name: "guildMemberAdd",
  run: async (client, member) => {
    try {
      if (!member || !member.guild) {
        console.error("Invalid member object received:", member);
        return;
      }
      const autoRole = await AutoRole.findOne({ guildId: member.guild.id });
      if (!autoRole) return;
      const rolesToAdd = [];
      if (member.user.bot) {
        const botRoles = autoRole.roles?.botRoles || [];
        for (const roleId of botRoles) {
          const botRole = member.guild.roles.cache.get(roleId) || await member.guild.roles.fetch(roleId).catch(() => null);
          if (botRole) {
            rolesToAdd.push(botRole);
          }
        }
      } else {
        const humanRoles = autoRole.roles?.humanRoles || [];
        for (const roleId of humanRoles) {
          const humanRole = member.guild.roles.cache.get(roleId) || await member.guild.roles.fetch(roleId).catch(() => null);
          if (humanRole) {
            rolesToAdd.push(humanRole);
          }
        }
      }
      if (rolesToAdd.length > 0) {
        await member.roles.add(rolesToAdd).catch((err) => {
          console.log(`missing perms in ${member.guild.name} autorole: ${err.message}`);
        });
      }
    } catch (err) {
      console.error("Error handling guildMemberAdd event:", err);
    }
  },
};
