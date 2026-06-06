const { VoiceStateUpdate } = require("discord.js");
const VoiceRole = require("../../schema/voicerole"); // Schema to manage roles

module.exports = {
  name: "voiceStateUpdate",
  run: async (client, oldState, newState) => {
    const guild = newState.guild;

    try {
      // Fetch the role configuration for the guild
      const voiceRoleConfig = await VoiceRole.findOne({ guildId: guild.id });
      if (!voiceRoleConfig) return; // If no config exists, exit

      const roleId = voiceRoleConfig.roleId;
      if (!roleId) {
        // If roleId is invalid, delete the database entry
        await VoiceRole.deleteOne({ guildId: guild.id });
        return;
      }

      const role = guild.roles.cache.get(roleId);
      if (!role) {
        // If the role is missing, delete the database entry and exit
        console.log(
          `Role not found in guild ${guild.name}. Removing configuration.`,
        );
        await VoiceRole.deleteOne({ guildId: guild.id });
        return;
      }

      const member = newState.member;

      // Member joins a VC
      if (!oldState.channelId && newState.channelId) {
        if (!member.roles.cache.has(roleId)) {
          await member.roles.add(role).catch(async () => {
            console.log(
              `Missing permissions to assign role in ${guild.name}. Removing configuration.`,
            );
            await VoiceRole.deleteOne({ guildId: guild.id });
          });
        }
      }

      // Member leaves a VC
      if (oldState.channelId && !newState.channelId) {
        if (member.roles.cache.has(roleId)) {
          await member.roles.remove(role).catch(async () => {
            console.log(
              `Missing permissions to remove role in ${guild.name}. Removing configuration.`,
            );
            await VoiceRole.deleteOne({ guildId: guild.id });
          });
        }
      }
    } catch (err) {
      console.error("Error in voice role system:", err);
      // Additional safeguard to clean up if unexpected errors occur
      try {
        await VoiceRole.deleteOne({ guildId: guild.id });
        console.log(`Configuration removed for ${guild.name} due to an error.`);
      } catch (cleanupErr) {
        console.error("Failed to clean up database entry:", cleanupErr);
      }
    }
  },
};
