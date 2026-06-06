const { v2 } = require("../../utils/v2");
const {
  EmbedBuilder,
  MessageFlags,
  ButtonBuilder,
  ActionRowBuilder,
  ButtonStyle,
} = require("discord.js");
const load = require("lodash");
const { isBotOwner } = require("../../utils/owners");

module.exports = {
  name: "serverlist",
  category: "Owner",
  description: "Listing Of Servers",
  aliases: ["sl"],
  args: false,
  usage: "<string>",
  permission: [],
  owner: false,
  execute: async (message, args, client, prefix) => {
    if (!isBotOwner(client, message.author.id)) return message.reply(v2(`You can't use this command.`));
    const serverlist = client.guilds.cache.map(
      (guild, i) =>
        `\`[ • ]\` | ${guild.name} | \`[ ${guild.id} ]\` | \`[${guild.memberCount}]\``,
    );
    const mapping = load.chunk(serverlist, 10);
    const pages = mapping.map((s) => s.join("\n"));
    let page = 0;

    const embed2 = new EmbedBuilder()
      
      .setDescription(pages[page])

      .setFooter({
        text: `Page ${page + 1}/${pages.length}`,
        iconURL: message.author.displayAvatarURL({ dynamic: true }),
      })
      .setTitle(`${message.client.user.username} Server list`);

    const but1 = new ButtonBuilder()
      .setCustomId("queue_cmd_but_1")
      .setLabel(">>")
      .setStyle(ButtonStyle.Secondary);

    const but2 = new ButtonBuilder()
      .setCustomId("queue_cmd_but_2")
      .setLabel("<<")
      .setStyle(ButtonStyle.Secondary);

    const but3 = new ButtonBuilder()
      .setCustomId("queue_cmd_but_3")
      .setEmoji(client.emoji.cross)
      .setStyle(ButtonStyle.Secondary);

    const row1 = new ActionRowBuilder().addComponents([but2, but3, but1]);

    const msg = await message.channel.send(v2({
      embeds: [embed2],
      components: [row1],
    }));

    const collector = msg.createMessageComponentCollector({
      filter: (b) => {
        if (b.user.id === message.author.id) return true;
        else {
          b.reply(v2({
            flags: MessageFlags.Ephemeral,
            content: `${client.emoji.cross} | Only **${message.author.tag}** can use this button, if you want then you've to run the command again.`,
          }));
          return false;
        }
      },
      time: 60000 * 5,
      idle: 30e3,
    });

    collector.on("collect", async (button) => {
      if (button.customId === "queue_cmd_but_1") {
        await button.deferUpdate().catch(() => {});
        page = page + 1 < pages.length ? ++page : 0;

        const embed3 = new EmbedBuilder()
          
          .setDescription(pages[page])

          .setFooter({
            text: `Page ${page + 1}/${pages.length}`,
            iconURL: message.author.displayAvatarURL({ dynamic: true }),
          })
          .setTitle(`${message.client.user.username} serverlist`);

        await msg.edit(v2({
          embeds: [embed3],
          components: [row1],
        }));
      } else if (button.customId === "queue_cmd_but_2") {
        await button.deferUpdate().catch(() => {});
        page = page > 0 ? --page : pages.length - 1;

        const embed4 = new EmbedBuilder()
          
          .setDescription(pages[page])

          .setFooter({
            text: `Page ${page + 1}/${pages.length}`,
            iconURL: message.author.displayAvatarURL({ dynamic: true }),
          })
          .setTitle(`${message.client.user.username} serverlist`);

        await msg
          .edit(v2({
            embeds: [embed4],
            components: [row1],
          }))
          .catch(() => {});
      } else if (button.customId === "queue_cmd_but_3") {
        await button.deferUpdate().catch(() => {});
        collector.stop();
      } else return;
    });

    collector.on("end", async () => {
      await msg.edit(v2({
        components: [],
      }));
    });
  },
};
