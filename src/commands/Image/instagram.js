const { v2 } = require("../../utils/v2");
const { AttachmentBuilder } = require("discord.js");
const canvafy = require("canvafy");

module.exports = {
  name: "instagram",
  aliases: ["insta"],
  category: "Image",
  cooldown: 3,
  description: "Simulate an Instagram post for a mentioned user.",
  execute: async (message, args, client, prefix) => {
    const member = message.mentions.members.first();
    if (!member) return message.reply(v2(`Please mention a valid user.`));

    const LIKES = Math.floor(Math.random() * 101);
    const username = member.user.username.replace(/[^a-zA-Z0-9_]/g, "").trim();

    try {
      const insta = await new canvafy.Instagram()
        .setTheme("dark")
        .setUser({ username: username })
        .setLike({ count: LIKES, likeText: "likes" })
        .setVerified(true)
        .setStory(true)
        .setPostDate(Date.now() - 1000 * 60 * 60 * 24 * 2)
        .setAvatar(member.user.displayAvatarURL({ extension: "png" }))
        .setPostImage(member.user.displayAvatarURL({ extension: "png" }))
        .setLiked(true)
        .setSaved(true)
        .build();

      const attachment = new AttachmentBuilder(insta, {
        name: "instagram_post.png",
      });
      await message.channel.send(v2({ files: [attachment] }));
    } catch (err) {
      console.error(err);
      message.reply(v2(`An error occurred while generating the Instagram post.`));
    }
  },
};
