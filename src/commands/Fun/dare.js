const { v2 } = require("../../utils/v2");
const { EmbedBuilder } = require("discord.js");

module.exports = {
  name: "dare",
  category: "Fun",
  aliases: ["dare"],
  cooldown: 3,
  description: "Give a random dare",
  args: false,
  usage: "",
  userPerms: [],
  execute(message, args, client, prefix) {
    const dare = [
      "Give an insult to every person in the room.",
      "Put your toe in your mouth. If you cannot do that then you have to put someone else’s toe in your mouth.",
      "Show the most embarrassing photo on your phone",
      "Show the last five people you texted and what the messages said",
      "Let the rest of the group DM someone from your Instagram account",
      "Eat a raw piece of garlic",
      "Do 100 squats",
      "Keep three ice cubes in your mouth until they melt",
      "Say something dirty to the person on your left",
      "Give a foot massage to the person on your right",
      "Put 10 different available liquids into a cup and drink it",
      "Yell out the first word that comes to your mind",
      "Give a lap dance to someone of your choice",
      "Remove four items of clothing",
      "Like the first 15 posts on your Facebook newsfeed",
      "Eat a spoonful of mustard",
      "Keep your eyes closed until it's your go again",
      "Send a sext to the last person in your phonebook",
      "Say two honest things about everyone else in the group",
      "Try and make the group laugh as quickly as possible",
      "Try to put your left hand in your right eye",
      "Pretend to be the person to your right for 10 minutes",
      "Eat a snack without using your hands",
      "Try to do a stand up comedy in front of the other players.",
    ];
    const randomDare = dare[Math.floor(Math.random() * dare.length)];
    message.channel.send(v2({
      embeds: [
        new EmbedBuilder()
          
          .setTitle(`${message.author.username} Here is Your Dare:`)
          .setDescription(`${randomDare}`),
      ],
    }));
  },
};
