const { v2 } = require("../../utils/v2");
const { EmbedBuilder, PermissionsBitField } = require("discord.js");

module.exports = {
  name: "mute",
  category: "Moderation",
  aliases: ["stfu"],
  cooldown: 3,
  description: "Mute a user",
  args: false,
  usage: "",
  userPerms: ["ModerateMembers"],
  botPerms: ["ModerateMembers"],
  owner: false,
  execute: async (message, args, client, prefix) => {
    let member = message.mentions.members.first();
    if (!member && args[0]) {
      member = await message.guild.members.fetch(args[0]).catch(() => null);
    }

    if (!member) {
      return message.reply(v2({
        embeds: [
          new EmbedBuilder()
            
            .setTitle("**__Mute Command__**")
            .addFields(
              { name: "Aliases", value: "`mute | stfu`" },
              { name: "Duration", value: "`10s, 1m, 1h, 1d`" },
              { name: "Usage", value: "`$mute <mention/userid> [duration] [reason]`" }
            ),
        ],
      }));
    }

    const duration = args[1] ? getValue(args[1]) : 28 * 24 * 60 * 60; // Default 28d
    if (duration < 10) {
      return message.reply(v2({
        embeds: [
          new EmbedBuilder()
            
            .setDescription(`${client.emoji.cross} | Mute duration must be at least \`10s\`.`),
        ],
      }));
    }

    if (member.roles.highest.position >= message.member.roles.highest.position &&
        message.author.id !== message.guild.ownerId) {
      return message.reply(v2({
        embeds: [
          new EmbedBuilder()
            
            .setDescription(`${client.emoji.cross} | You cannot mute a user with an equal or higher role.`),
        ],
      }));
    }

    if (member.roles.highest.position >= message.guild.members.me.roles.highest.position) {
      return message.reply(v2({
        embeds: [
          new EmbedBuilder()
            
            .setDescription(`${client.emoji.cross} | I cannot mute this user due to role hierarchy.`),
        ],
      }));
    }

    let reason = args.slice(2).join(" ").trim() || "No Reason";
    reason = `${message.author.tag} (${message.author.id}) | ${reason}`;

    try {
      await member.timeout(duration * 1000, reason);
      return message.reply(v2({
        embeds: [
          new EmbedBuilder()
            
            .setDescription(`${client.emoji.tick} | Muted <@${member.user.id}> for **${args[1] || "28d"}**.`),
        ],
      }));
    } catch (error) {
      console.error(error);
      return message.reply(v2({
        embeds: [
          new EmbedBuilder()
            
            .setDescription(`${client.emoji.cross} | Failed to mute <@${member.user.id}>.`),
        ],
      }));
    }
  },
};

function getValue(str) {
  let result = 0;
  const regex = /(\d+)([smhd])/g;
  let match;
  while ((match = regex.exec(str)) !== null) {
    const value = parseInt(match[1]);
    const unit = match[2];
    if (unit === "h") result += value * 3600;
    if (unit === "m") result += value * 60;
    if (unit === "s") result += value;
    if (unit === "d") result += value * 86400;
  }
  return result;
}
