const { v2 } = require("../../utils/v2");
const {
  EmbedBuilder,
} = require("discord.js");
const db = require("../../schema/blacklist");
const NopAccess = require("../../schema/accessnop");
const { isBotOwner } = require("../../utils/owners");

module.exports = {
  name: `blacklist`,
  aliases: ["bl"],
  category: "Owner",
  description: "No prefix toggling",
  args: false,
  usage: "",
  owner: false,
  execute: async (message, args, client, prefix) => {
    const access = isBotOwner(client, message.author.id) ||
      await NopAccess.exists({ userId: message.author.id });
    if (!access) {
      message.channel.send(v2(`You can't add any user to my bl system`));
      return;
    }

    if (!args[0]) {
      return message.channel.send(v2({
        embeds: [
          new EmbedBuilder()
            
            .setDescription(
              ` \`\`\`[] = Optional Argument\n<> = Required Argument\nDo NOT type these when using commands!)\`\`\`\n\n**Aliases:**\n\`\`[bl]\`\`\n**Usage:**\n\`\`add/remove\`\``,
            ),
        ],
      }));
    }

    const opt = args[0].toLowerCase();

    if (opt === `add` || opt === `a` || opt === `+`) {
      const user =
        message.mentions.users.first() || client.users.cache.get(args[1]);
      if (!user) return message.reply(v2({ content: `Provide me a valid user` }));

      const npData = await db.findOne({ userId: user.id, noprefix: true });
      if (npData)
        return message.reply(v2({
          content: `${client.emoji.cross} | This user is already blacklisted`,
        }));
      else {
        const data = await db.create({ userId: user.id });
        const embedn = new EmbedBuilder()
          
          .setDescription(`${client.emoji.tick} | Added ${user} to blacklist`);
        return message.reply(v2({ embeds: [embedn] }));
      }
    } else if (opt === `remove` || opt === `r` || opt === `-`) {
      const user =
        message.mentions.users.first() || client.users.cache.get(args[1]);
      if (!user) return message.reply(v2({ content: `Provide me a valid user` }));

      const blData = await db.findOne({ userId: user.id });
      if (!blData)
        return message.reply(v2({
          content: `${client.emoji.cross} | This user is not blacklisted.`,
        }));

      await db.deleteOne({ userId: user.id });
      return message.reply(v2({
        embeds: [
          new EmbedBuilder()
            
            .setDescription(
              `${client.emoji.tick} | SuccessFully **Removed** ${user} from my blacklist.`,
            ),
        ],
      }));
    }
  },
};
