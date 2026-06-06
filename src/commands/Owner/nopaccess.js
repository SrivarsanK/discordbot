const { v2 } = require("../../utils/v2");
const {
  EmbedBuilder,
} = require("discord.js");
const db = require("../../schema/accessnop");
const { isBotOwner } = require("../../utils/owners");

module.exports = {
  name: `nopaccess`,
  aliases: ["nopperms", "npp"],
  category: "Owner",
  description: "No prefix toggling",
  args: false,
  usage: "",
  owner: false,
  execute: async (message, args, client, prefix) => {
    if (!isBotOwner(client, message.author.id)) {
      return message.channel.send(
        v2(`Only configured bot owners can manage noprefix access.`),
      );
    }

    if (!args[0]) {
      return message.channel.send(v2({
        embeds: [
          new EmbedBuilder()
            
            .setDescription(
              ` \`\`\`[] = Optional Argument\n<> = Required Argument\nDo NOT type these when using commands!)\`\`\`\n\n**Aliases:**\n\`\`[access]\`\`\n**Usage:**\n\`\`add/remove/list\`\``,
            ),
        ],
      }));
    }

    const opt = args[0].toLowerCase();

    if (opt === `add` || opt === `a` || opt === `+`) {
      const user =
        message.mentions.users.first() || client.users.cache.get(args[1]);
      if (!user) return message.reply(v2({ content: `Provide me a valid user` }));

      const npData = await db.findOne({ userId: user.id });
      if (npData)
        return message.reply(v2({
          content: `${client.emoji.cross} | This user is already in my nopaccess system.`,
        }));
      else {
        const data = await db.create({
          userId: user.id,
          noprefix: true,
        });

        const embedn = new EmbedBuilder()
          
          .setDescription(
            `_Now ${user} U Have NopAccess! Add By ${message.author}_`,
          )
          .setFooter({
            text: "Modified by SrivarsanK",
            iconURL: message.guild.iconURL(),
          });

        return message.reply(v2({ embeds: [embedn] }));
      }
    }
    if (opt === `remove` || opt === `r` || opt === `-`) {
      const user =
        message.mentions.users.first() || client.users.cache.get(args[1]);
      if (!user) return message.reply(v2({ content: `Provide me a valid user` }));

      const npData = await db.findOne({ userId: user.id });
      if (!npData)
        return message.reply(v2({
          content: `${client.emoji.cross} | This user is not in my nopaccess system.`,
        }));

      await db.deleteOne({ userId: user.id });
      return message.reply(v2({
        embeds: [
          new EmbedBuilder()
            
            .setDescription(
              `${client.emoji.tick} | SuccessFully **Removed** ${user} From My NopAccess`,
            ),
        ],
      }));
    }

    if (args[0].toLowerCase() === `list` || args[0].toLowerCase() === `show`) {
      const data = await db.find();
      const listing = [];
      data.forEach((x) => listing.push(x.userId));

      if (!listing.length) {
        return message.reply(v2({ content: `There Is No User In My NopAccess` }));
      }
      const list = data.map((x) => `<@${x.userId}>`);
      const embed = new EmbedBuilder()
        
        .setAuthor({ name: `NopAccess List`, iconURL: message.guild.iconURL() })
        .setFooter({
          text: client.user.username,
          iconURL: client.user.displayAvatarURL(),
        })
        .setDescription(`${list.join("\n")}`);
      return message.channel.send(v2({ embeds: [embed] }));
    } else if (opt === `clear`) {
      const data = await db.countDocuments();

      if (!data) return message.channel.send(v2({ content: `0` }));
      await db.deleteMany({});
      return message.channel.send(v2({
        content: `Successfully Cleared Access Of Nop`,
      }));
    }
  },
};
