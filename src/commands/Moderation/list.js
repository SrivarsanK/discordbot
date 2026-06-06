const { v2 } = require("../../utils/v2");
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { clearComponents } = require("../../utils/componentCleanup");

module.exports = {
  name: "list",
  aliases: ["l"],
  category: "Moderation",
  execute: async (message, args, client, prefix) => {
    if (!args[0]) {
      return message.reply(v2({
        embeds: [
          new client.embed()
            
            .setDescription(
              `You didn't provide the list type.\nList Options: \`admin\`,\`bot\`, \`inrole\`, \`ban\``,
            ),
        ],
      }));
    }

    const require = args[0].toLowerCase();
    let listItems = [];

    if (
      require === "admin" ||
      require === "admins" ||
      require === "administration"
    ) {
      const administrators = message.guild.members.cache.filter((member) =>
        member.permissions.has("Administrator"),
      );
      listItems = administrators.map(({ id }) => `<@${id}> | ${id}`);
    } else if (require === "bot" || require === "bots") {
      const bots = message.guild.members.cache.filter(
        (member) => member.user.bot,
      );
      if (!bots.size) {
        return message.reply(v2({
          embeds: [
            new client.embed()
              
              .setDescription(
                `${client.emoji.cross} | I guess there are no bots in this server.`,
              ),
          ],
        }));
      }
      listItems = bots.map(({ id }) => `<@${id}> | ${id}`);
    } else if (require === "inrole" || require === "role") {
      const role =
        message.mentions.roles.first() ||
        message.guild.roles.cache.get(args[1]) ||
        (await message.guild.roles.fetch(args[1]));
      if (!role) {
        return message.reply(v2({
          embeds: [
            new client.embed()
              
              .setDescription(`${client.emoji.cross} | No roles found.`),
          ],
        }));
      }
      listItems = role.members.map(({ id }) => `<@${id}> | ${id}`);
    } else if (require === "ban" || require === "bans") {
      const bans = await message.guild.bans.fetch();
      listItems = bans.map(
        ({ user }) =>
          `[${user.displayName}](https://discord.com/users/${user.id}) | ${user.id}`,
      );
      if (!listItems.length) {
        return message.reply(v2({
          embeds: [
            new client.embed()
              
              .setDescription(`There are no users banned.`),
          ],
        }));
      }
    } else {
      return message.reply(v2({
        embeds: [
          new client.embed()
            
            .setDescription(
              `Invalid list type provided.\nList Options: \`admin\`,\`bot\`, \`inrole\`, \`ban\``,
            ),
        ],
      }));
    }

    // Pagination Logic
    const pageSize = 10;
    let currentPage = 0;

    const generateEmbed = (page) => {
      const start = page * pageSize;
      const end = start + pageSize;
      const pageItems = listItems.slice(start, end);

      return new client.embed()
        .setTitle(`List for ${require} in ${message.guild.name}`)
        .setDescription(
          pageItems.length ? pageItems.join("\n") : "No items to display.",
        )
        
        .setFooter({
          text: `Page ${page + 1} of ${Math.ceil(listItems.length / pageSize)}`,
        });
    };

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("prev")
        .setLabel("◀️")
        .setStyle(2)
        .setDisabled(currentPage === 0),
      new ButtonBuilder()
        .setCustomId("next")
        .setLabel("▶️")
        .setStyle(2)
        .setDisabled((currentPage + 1) * pageSize >= listItems.length),
    );

    const messageReply = await message.reply(v2({
      embeds: [generateEmbed(currentPage)],
      components: [row],
    }));

    const filter = (interaction) => interaction.user.id === message.author.id;
    const collector = messageReply.createMessageComponentCollector({
      filter,
      time: 60000,
    });

    collector.on("collect", (interaction) => {
      if (interaction.customId === "prev" && currentPage > 0) {
        currentPage--;
      } else if (
        interaction.customId === "next" &&
        (currentPage + 1) * pageSize < listItems.length
      ) {
        currentPage++;
      }

      interaction.update(v2({
        embeds: [generateEmbed(currentPage)],
        components: [
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId("prev")
              .setLabel("◀️")
              .setStyle(2)
              .setDisabled(currentPage === 0),
            new ButtonBuilder()
              .setCustomId("next")
              .setLabel("▶️")
              .setStyle(2)
              .setDisabled((currentPage + 1) * pageSize >= listItems.length),
          ),
        ],
      }));
    });

    collector.on("end", () => {
      clearComponents(messageReply);
    });
  },
};
