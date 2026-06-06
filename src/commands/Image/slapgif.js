const { v2 } = require("../../utils/v2");
const {
  EmbedBuilder,
  MessageFlags,
  ButtonBuilder,
  ActionRowBuilder,
  ButtonStyle,
} = require("discord.js");

module.exports = {
  name: "slap",
  category: "Image",
  aliases: ["chaate", "slp"],
  cooldown: 3,
  description: "",
  args: false,
  usage: "Slap <Mention Or ID> | <Text>",
  userPerms: [],
  owner: false,
  execute: async (message, args, client, prefix) => {
    const Member =
      message.mentions.members.first() ||
      message.guild.members.cache.get(args[0]);
    if (!Member)
      return message.channel.send(v2("Please Mention Or Give ID Of A Member!"));

    const Other = args.slice(1).join(" ") || `Shut up ${Member.user.username} `;
    if (Other.length > 50)
      return message.channel.send(v2("Characters Limit Reached - 50!"));

    const Embed = new EmbedBuilder()
      .setTitle("Slapped")
      
      .setImage(
        encodeURI(
          `https://vacefron.nl/api/batmanslap?text1=bruh&text2=${Other}&batman=${message.author.avatarURL({ format: "png" })}&robin=${Member.user.displayAvatarURL({ format: "png" })}`,
        ),
      )
      .setTimestamp();

    return message.channel.send(v2({ embeds: [Embed] }));
  },
};
