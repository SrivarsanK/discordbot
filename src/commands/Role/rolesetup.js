/** @format */

const { v2 } = require("../../utils/v2");

const { EmbedBuilder } = require("discord.js");
const Roles = require("../../schema/roles"); // Import the role schema

module.exports = {
  name: "rolesetup",
  category: "Role",
  aliases: ["rs"],
  description: "Configure and manage custom roles for the server.",
  args: true,
  usage: "<subcommand> <role>",
  userPerms: ["Administrator"],
  owner: false,
  execute: async (message, args, client, prefix) => {
    const subcommand = args[0].toLowerCase();
    const guildId = message.guild.id;

    if (!message.member.permissions.has("Administrator")) {
      return message.channel.send(v2({
        embeds: [
          new EmbedBuilder()
            .setDescription("You do not have permission to use this command!")
            ,
        ],
      }));
    }

    if (!args[1] && subcommand !== "config" && subcommand !== "reset") {
      return message.channel.send(v2({
        embeds: [
          new EmbedBuilder()
            .setDescription("You must mention or provide a valid role!")
            ,
        ],
      }));
    }

    const roled =
      message.mentions.roles.first() || message.guild.roles.cache.get(args[1]);

    if (!roled && subcommand !== "config" && subcommand !== "reset") {
      return message.channel.send(v2({
        embeds: [
          new EmbedBuilder()
            .setDescription("Please mention or provide a valid role!")
            ,
        ],
      }));
    }

    if (roled && roled.permissions.has("Administrator")) {
      return message.reply(v2({
        embeds: [
          new EmbedBuilder()
            .setDescription(
              "You cannot assign an Administrator role. Please choose another role.",
            )
            ,
        ],
      }));
    }

    const saveRole = async (fieldName, role) => {
      let guildRoles = await Roles.findOne({ guildId });
      if (!guildRoles) guildRoles = new Roles({ guildId });

      guildRoles[fieldName] = role.id;
      await guildRoles.save();

      return message.channel.send(v2({
        embeds: [
          new EmbedBuilder()
            .setDescription(
              `Successfully set the ${fieldName.replace(/_/g, " ")} role to ${
                role.name
              }.`,
            )
            ,
        ],
      }));
    };

    switch (subcommand) {
      case "reqrole":
      case "official":
      case "friend":
      case "guest":
      case "girl":
      case "vip": {
        return saveRole(subcommand, roled);
      }

      case "config": {
        const guildRoles = await Roles.findOne({ guildId });
        if (!guildRoles) {
          return message.channel.send(v2({
            embeds: [
              new EmbedBuilder()
                .setDescription("No role configuration found for this server.")
                ,
            ],
          }));
        }

        const fields = [
          "reqrole",
          "official",
          "friend",
          "guest",
          "girl",
          "vip",
        ].map((field) => ({
          name: `${field.replace(/_/g, " ").toUpperCase()}`,
          value: guildRoles[field] ? `<@&${guildRoles[field]}>` : "Not set",
          inline: true,
        }));

        return message.channel.send(v2({
          embeds: [
            new EmbedBuilder()
              .setTitle("**__Custom Role Configuration__**")
              .setFields(fields)
              
              .setFooter({
                text: `Requested by ${message.author.tag}`,
                iconURL: message.author.displayAvatarURL(),
              }),
          ],
        }));
      }

      case "reset": {
        await Roles.findOneAndDelete({ guildId });

        return message.channel.send(v2({
          embeds: [
            new EmbedBuilder()
              .setDescription("All custom role configurations have been reset.")
              ,
          ],
        }));
      }

      default:
        return message.channel.send(v2({
          embeds: [
            new EmbedBuilder()
              .setDescription(
                "Invalid subcommand. Use the help panel for guidance.",
              )
              ,
          ],
        }));
    }
  },
};
