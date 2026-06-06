const { v2 } = require("../../utils/v2");
const Profile = require("../../schema/profile");

module.exports = {
  name: "bioreset",
  aliases: ["about-"],
  category: "Profile",
  cooldown: 3,
  description: "Reset your saved profile.",
  args: false,
  usage: "",
  owner: false,
  execute: async (message, args, client) => {
    const userProfile = await Profile.findOne({ User: message.author.id });
    if (!userProfile) {
      return message.reply(v2(`${client.emoji.cross || ""} You do not have a profile to reset.`));
    }

    await Profile.deleteOne({ User: message.author.id });
    return message.reply(v2(`${client.emoji.tick || ""} Successfully reset your profile.`));
  },
};
