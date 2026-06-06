const { v2 } = require("../../utils/v2");
module.exports = {
  name: "snipe",
  category: "Utility",
  description: "Snipes the last deleted message in this channel",
  cooldown: 5, // Optional cooldown in seconds

  execute: async (message, args, client, prefix) => {
    const snipe = client.snipes?.get(message.channel.id);

    if (!snipe) return message.channel.send(v2("There's nothing to snipe!"));

    const embed = new client.embed()
      .setAuthor({
        name: snipe.author.tag,
        iconURL: snipe.author.displayAvatarURL({ dynamic: true }),
      })
      .setDescription(snipe.content || "*No content*")
      .setFooter({ text: `Sniped by ${message.author.tag}` })
      .setTimestamp(snipe.time);

    if (snipe.image) embed.setImage(snipe.image);

    message.channel.send(v2({ embeds: [embed] }));
  },
};
