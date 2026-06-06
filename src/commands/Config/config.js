const { v2 } = require("../../utils/v2");
const { EmbedBuilder } = require("discord.js");
const db = require("../../schema/247");
const { getFooterText } = require("../../utils/botMeta");

module.exports = {
  name: "config",
  category: "Config",
  description: "To check text & voice channels",
  userPrams: [],
  botPrams: ["EmbedLinks"],
  owner: false,
  cooldown: 3,
  execute: async (message, args, client, prefix) => {
    const player = client.manager.players.get(message.guild.id);
    const data = await db.findOne({ Guild: message.guild.id });
    const text = player ? `<#${player.textId}>` : "play something";
    const autoplay = player?.data?.get("autoplay") ? client.emoji.tick : client.emoji.cross;
    const voice = player ? `<#${player.voiceId}>` : "play something";
    const status = data ? client.emoji.tick : client.emoji.cross;

    const embed = new client.embed()
      .setAuthor({
        name: `Server Configuration`,
        iconURL: message.guild.iconURL(),
      })
      .d(
        `**Prefix For This Server:** \`${prefix}\`\n- **Autoplay:** ${autoplay}\n- **247:** ${status}\n- **Player Created:** ${player ? client.emoji.tick : client.emoji.cross}\n${player ? `> ${client.emoji.dot} **Text:** ${text}\n> ${client.emoji.dot} **Voice:** ${voice}` : " "}`,
      )
      .setFooter({
        text: getFooterText(client),
      });
    await message.channel.send(v2({ embeds: [embed] }));
  },
};
