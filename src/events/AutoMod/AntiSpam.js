const { v2 } = require("../../utils/v2");
const AntiSpam = require("../../schema/antispam");

module.exports = {
  name: "messageCreate",
  run: async (client, message) => {
    if (!message.guild || message.author.bot) return;
    if (message.member.permissions.has("Administrator")) return;

    const antiSpamData = await AntiSpam.findOne({ guildId: message.guild.id });
    if (!antiSpamData || !antiSpamData.isEnabled) return;

    const userId = message.author.id;
    const userMessages = client.spamMap.get(userId) || [];
    const currentTime = Date.now();

    // Track messages
    userMessages.push(currentTime);
    client.spamMap.set(
      userId,
      userMessages.filter(
        (time) => currentTime - time <= antiSpamData.timeframe * 1000,
      ),
    );

    if (client.spamMap.get(userId).length > antiSpamData.messageThreshold) {
      if (
        !antiSpamData.whitelistUsers.includes(userId) &&
        !message.member.roles.cache.some((role) =>
          antiSpamData.whitelistRoles.includes(role.id),
        )
      ) {
        await message.delete();
        await message.channel.send(
          v2(`${message.author}, spamming is not allowed.`),
        );
      }
    }
  },
};
