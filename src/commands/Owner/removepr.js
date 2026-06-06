const { v2 } = require("../../utils/v2");
const {
  EmbedBuilder,
  MessageFlags,
  ButtonBuilder,
  ActionRowBuilder,
  ButtonStyle,
} = require("discord.js");
const Data = require("../../schema/badge");
const { isBotOwner } = require("../../utils/owners");

module.exports = {
  name: "removepr",
  aliases: ["rpr"],
  description: "remove badges to member",
  category: "Owner",
  botPermissions: ["EmbedLinks"],
  owner: false,
  execute: async (message, args, client, prefix, player, guildData) => {
    if (!isBotOwner(client, message.author.id)) {
      return message.reply(v2(`You Can't Use This Command!`));
    }

    const member =
      message.mentions.users.first() ||
      client.users.cache.get(args[0]) ||
      (await client.users.fetch(args[0]).catch(() => null));
    if (!member) {
      return message.reply(v2(`Please mention a user`));
    }

    let Member = await Data.findOne({ userId: member.id });
    if (!Member) {
      Member = await Data.create({ userId: member.id });
    }

    const owner = {
      color: 0x2f3136,
      description: `Removed ${client.emoji.owner} badge to <@${member.id}>`,
    };

    const dev = {
      color: 0x2f3136,
      description: `Removed ${client.emoji.dev} badge to <@${member.id}>`,
    };

    const admin = {
      color: 0x2f3136,
      description: `Removed ${client.emoji.admin} badge to <@${member.id}>`,
    };

    const staff = {
      color: 0x2f3136,
      description: `Removed ${client.emoji.staff} badge to <@${member.id}>`,
    };

    const partner = {
      color: 0x2f3136,
      description: `Removed ${client.emoji.partner} badge to <@${member.id}>`,
    };

    const supporter = {
      color: 0x2f3136,
      description: `Removed ${client.emoji.supporter} badge to <@${member.id}>`,
    };

    const sponsor = {
      color: 0x2f3136,
      description: `Removed ${client.emoji.sponsor} badge to <@${member.id}>`,
    };

    const ownerspecial = {
      color: 0x2f3136,
      description: `Removed ${client.emoji.ownerspecial} badge to <@${member.id}>`,
    };

    const specialone = {
      color: 0x2f3136,
      description: `Removed ${client.emoji.specialone} badge to <@${member.id}>`,
    };

    const loveone = {
      color: 0x2f3136,
      description: `Removed ${client.emoji.loveone} badge to <@${member.id}>`,
    };

    const vip = {
      color: 0x2f3136,
      description: `Removed ${client.emoji.vip} badge to <@${member.id}>`,
    };

    const friend = {
      color: 0x2f3136,
      description: `Removed ${client.emoji.friend} badge to <@${member.id}>`,
    };

    const bug = {
      color: 0x2f3136,
      description: `Removed ${client.emoji.bug} badge to <@${member.id}>`,
    };

    const noprefix = {
      color: 0x2f3136,
      description: `Removed ${client.emoji.noprefix} badge to <@${member.id}>`,
    };

    const all = {
      color: 0x2f3136,
      description: `Removed ${client.emoji.owner} ${client.emoji.dev} ${client.emoji.admin} ${client.emoji.staff} ${client.emoji.partner} ${client.emoji.supporter} ${client.emoji.sponsor} ${client.emoji.ownerspecial} ${client.emoji.specialone} ${client.emoji.loveone} ${client.emoji.vip} ${client.emoji.friend} ${client.emoji.bug} badges to <@${member.id}>`,
    };

    if (!args[1]) {
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
      return message.reply(v2({ embeds: [embed] }));
    }
    if (args[1] === "owner") {
      Member.badge.owner = false;
      await Member.save();

      return message.reply(v2({ embeds: [owner] }));
    } else if (args[1] === "dev") {
      Member.badge.dev = false;
      await Member.save();

      return message.reply(v2({ embeds: [dev] }));
    } else if (args[1] === "admin") {
      Member.badge.admin = false;
      await Member.save();

      return message.reply(v2({ embeds: [admin] }));
    } else if (args[1] === "staff") {
      Member.badge.staff = false;
      await Member.save();

      return message.reply(v2({ embeds: [staff] }));
    } else if (args[1] === "partner") {
      Member.badge.partner = false;
      await Member.save();

      return message.reply(v2({ embeds: [partner] }));
    } else if (args[1] === "supporter") {
      Member.badge.supporter = false;
      await Member.save();

      return message.reply(v2({ embeds: [supporter] }));
    } else if (args[1] === "sponsor") {
      Member.badge.sponsor = false;
      await Member.save();

      return message.reply(v2({ embeds: [sponsor] }));
    } else if (args[1] === "ownerspecial") {
      Member.badge.ownerspecial = false;
      await Member.save();

      return message.reply(v2({ embeds: [ownerspecial] }));
    } else if (args[1] === "specialone") {
      Member.badge.specialone = false;
      await Member.save();

      return message.reply(v2({ embeds: [specialone] }));
    } else if (args[1] === "loveone") {
      Member.badge.loveone = false;
      await Member.save();

      return message.reply(v2({ embeds: [loveone] }));
    } else if (args[1] === "vip") {
      Member.badge.vip = false;
      await Member.save();

      return message.reply(v2({ embeds: [vip] }));
    } else if (args[1] === "friend") {
      Member.badge.friend = false;
      await Member.save();

      return message.reply(v2({ embeds: [friend] }));
    } else if (args[1] === "bug") {
      Member.badge.bug = false;
      await Member.save();

      return message.reply(v2({ embeds: [bug] }));
    } else if (args[1] === "noprefix") {
      Member.badge.noprefix = false;
      await Member.save();

      return message.reply(v2({ embeds: [noprefix] }));
    } else if (args[1] === "all") {
      Member.badge.owner = false;
      Member.badge.dev = false;
      Member.badge.admin = false;
      Member.badge.staff = false;
      Member.badge.partner = false;
      Member.badge.supporter = false;
      Member.badge.sponsor = false;
      Member.badge.ownerspecial = false;
      Member.badge.specialone = false;
      Member.badge.loveone = false;
      Member.badge.vip = false;
      Member.badge.friend = false;
      Member.badge.bug = false;
      await Member.save();

      return message.reply(v2({ embeds: [all] }));
    } else {
      return message.reply(v2("Invalid option."));
    }
  },
};
