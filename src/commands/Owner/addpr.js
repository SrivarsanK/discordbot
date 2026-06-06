/** @format */

const { v2 } = require("../../utils/v2");

const {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
} = require("discord.js");
const Data = require("../../schema/badge");
const { isBotOwner } = require("../../utils/owners");

module.exports = {
  name: "addpr",
  category: "Owner",
  aliases: ["addbadges"],
  description: "to see member profile",
  args: false,
  usage: "",
  userPerms: [],
  owner: false,
  execute: async (message, args, client, prefix, player, guildData) => {


    if (!isBotOwner(client, message.author.id)) {
      return message.reply(v2(`You Can't Use This Command!`));
    }

    const user =
      message.mentions.members.first() ||
      message.guild.members.cache.get(args[0]);
    if (!user) {
      return message.reply(v2("Please mention a user."));
    }

    if (user) {
      let persons = await Data.findOne({ userId: user.id });
      if (!persons) {
        persons = await Data.create({ userId: user.id });
      }

      const embed = new EmbedBuilder()
        .setTitle("__Which 1>?__")
        .addFields({
          name: "Premium.?",
          value:
            "> _Creator,\n> Girlowner,\n> Owner,\n> Dev,\n> Admin,\n> Staff,\n> Partner,\n> Supporter,\n> Sponsor,_",
          inline: true,
        })
        .addFields({
          name: "For All.?",
          value:
            "> _Ownerspecial,\n> Specialone,\n> Loveone,\n> Vip,\n> Friend,\n> Gfriend,\n> Bug,\n> Noprefix_",
          inline: true,
        })
        
        .setFooter({ text: "Modified by SrivarsanK" });

      const main = new ActionRowBuilder().addComponents([
        new StringSelectMenuBuilder()
          .setCustomId("badges")
          .setPlaceholder("Select badges")
          .setMinValues(1)
          .setMaxValues(15)
          .addOptions(
            { label: "Owner", value: "owner", emoji: client.emoji.owner },
            { label: "Dev", value: "dev", emoji: client.emoji.dev },
            { label: "Admin", value: "admin", emoji: client.emoji.admin },
            { label: "Staff", value: "staff", emoji: client.emoji.staff },
            { label: "Partner", value: "partner", emoji: client.emoji.partner },
            {
              label: "Supporter",
              value: "supporter",
              emoji: client.emoji.supporter,
            },
            { label: "Sponsor", value: "sponsor", emoji: client.emoji.sponsor },
            {
              label: "Ownerspecial",
              value: "ownerspecial",
              emoji: client.emoji.ownerspecial,
            },
            {
              label: "Specialone",
              value: "specialone",
              emoji: client.emoji.specialone,
            },
            { label: "Loveone", value: "loveone", emoji: client.emoji.loveone },
            { label: "Vip", value: "vip", emoji: client.emoji.vip },
            { label: "Friend", value: "friend", emoji: client.emoji.friend },
            { label: "Bug", value: "bug", emoji: client.emoji.bug },
            { label: "No Prefix", value: "noprefix", emoji: client.emoji.noprefix },
            { label: "All", value: "all" },
          ),
      ]);

      const msg = await message.channel.send(v2({
        embeds: [embed],
        components: [main],
      }));

      const collector = await msg.createMessageComponentCollector({
        filter: (i) => {
          if (message.author.id === i.user.id) return true;
          else {
            i.reply(v2({
              content: `${client.emoji.cross} | That's not your session run : \`${prefix}help\` to create your own.`,
              ephemeral: true,
            }));
          }
        },
        time: 60000,
      });

      collector.on("collect", async (i) => {
        if (i.customId === "badges") {
          const badges = i.values;
          let Member = await Data.findOne({ userId: user.id });
          if (!Member) {
            Member = await Data.create({ userId: user.id });
          }
          for (const badge of badges) {
            if (badge === "owner") {
              Member.badge.owner = true;
            } else if (badge === "dev") {
              Member.badge.dev = true;
            } else if (badge === "admin") {
              Member.badge.admin = true;
            } else if (badge === "staff") {
              Member.badge.staff = true;
            } else if (badge === "partner") {
              Member.badge.partner = true;
            } else if (badge === "supporter") {
              Member.badge.supporter = true;
            } else if (badge === "sponsor") {
              Member.badge.sponsor = true;
            } else if (badge === "ownerspecial") {
              Member.badge.ownerspecial = true;
            } else if (badge === "specialone") {
              Member.badge.specialone = true;
            } else if (badge === "loveone") {
              Member.badge.loveone = true;
            } else if (badge === "vip") {
              Member.badge.vip = true;
            } else if (badge === "friend") {
              Member.badge.friend = true;
            } else if (badge === "bug") {
              Member.badge.bug = true;
            } else if (badge === "noprefix") {
              Member.badge.noprefix = true;
            } else if (badge === "all") {
              Member.badge.owner = true;
              Member.badge.dev = true;
              Member.badge.admin = true;
              Member.badge.staff = true;
              Member.badge.partner = true;
              Member.badge.supporter = true;
              Member.badge.sponsor = true;
              Member.badge.ownerspecial = true;
              Member.badge.specialone = true;
              Member.badge.loveone = true;
              Member.badge.vip = true;
              Member.badge.friend = true;
              Member.badge.bug = true;
            }
          }
          await Member.save();
          i.reply(v2({
            embeds: [
              new EmbedBuilder()
                
                .setDescription(
                  `Added **${badges.length}** badges to <@${user.id}>`,
                ),
            ],
          }));
        }
      });
    }
  },
};
