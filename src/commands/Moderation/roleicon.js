const { v2 } = require("../../utils/v2");
module.exports = {
  name: "roleicon",
  aliases: ["seticon", "ri"],
  cooldown: 3,
  category: "Moderation",
  description: "Set a role’s icon",
  args: false,
  usage: "roleicon <role> <emoji (id/url)>",
  userPerms: ["ManageRoles"],
  botPerms: ["Administrator"],
  owner: false,

  execute: async (message, args, client, prefix) => {
    const idMatch =
      args[1]?.match(/<a?:[^:]+:(\d+)>/) || args[1]?.match(/\/emojis\/(\d+)/);
    const id = idMatch ? idMatch[1] : null;

    const Oxp =
      message.mentions.roles.first()?.id ||
      args[0]?.replace(/[^0-9]/g, "") ||
      message.guild.roles.cache.find((r) => r.name === args[0])?.id;

    const role = Oxp
      ? await message.guild.roles.fetch(Oxp, { force: true }).catch(() => null)
      : null;

    if (message.guild.premiumTier < 2) {
      return message.channel.send(v2({
        embeds: [
          new client.embed().setDescription(
            `${client.emoji.cross} ${message.author}: The guild must have booster level \`2\` or above.`,
          ),
        ],
      }));
    }

    if (!role) {
      return message.channel.send(v2(`Invalid role!`));
    }

    if (!id) {
      return message.channel.send(v2(`You didn't provide a valid emoji.`));
    }

    try {
      const emojiUrl = `https://cdn.discordapp.com/emojis/${id}.${args[1]?.startsWith("<a:") ? "gif" : "png"}`;
      await role.setIcon(emojiUrl);
      return message.channel.send(v2({
        embeds: [
          new client.embed().setDescription(
            `${client.emoji.tick} ${message.author}: Edited ${role}`,
          ),
        ],
      }));
    } catch (error) {
      return message.channel.send(v2(`Couldn't edit the role!`));
    }
  },
};
