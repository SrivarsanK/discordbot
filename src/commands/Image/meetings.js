const { v2 } = require("../../utils/v2");
const {
  EmbedBuilder,
  MessageFlags,
  ButtonBuilder,
  ActionRowBuilder,
  ButtonStyle,
} = require("discord.js");

module.exports = {
  name: "meeting",
  category: "Image",
  aliases: ["amongusmeeting", "mtg"],
  cooldown: 3,
  description: "",
  args: false,
  usage: "Meeting <Text>",
  userPerms: [],
  owner: false,
  execute: async (message, args, client, prefix) => {
    const Value = args.join(" ");

    if (!Value || Value.length > 150)
      return message.channel.send(
        v2("Please Give Meeting Text And Make Sure Its Not 150+ Characters Long!"),
      );

    const Embed = new EmbedBuilder()
      
      .setTitle("Emergency Meeting (" + message.author.username + ")")
      .setImage(
        encodeURI(`https://vacefron.nl/api/emergencymeeting?text=${Value}`),
      )
      .setTimestamp();

    return message.channel.send(v2({ embeds: [Embed] }));
  },
};
