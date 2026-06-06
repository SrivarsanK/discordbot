const { v2 } = require("../../utils/v2");
const {
  EmbedBuilder,
  MessageFlags,
  ButtonBuilder,
  ActionRowBuilder,
  ButtonStyle,
} = require("discord.js");

module.exports = {
  name: "animes",
  category: "Pfp",
  cooldown: 3,
  aliases: ["animes"],
  description: "Sends a random profile picture or gif from a list of links.",
  execute: async (message, args, client, prefix) => {
    const animepfps = [
      "https://cdn.discordapp.com/attachments/608711487325995008/1018650218113286195/IMG_1813.jpg",
      "https://cdn.discordapp.com/attachments/608711487325995008/1018289296047870062/ab85225a3657fd369d1dee20d036e019.jpg",
      "https://cdn.discordapp.com/attachments/608711487325995008/1018289294189805648/00dc090b2e90aea174f5fad47d90648f.jpg",
      "https://cdn.discordapp.com/attachments/608711487325995008/1018159501930659860/6b23aaa52d04bc4805ea1eb9b5b5ee9d.jpg",
      "https://cdn.discordapp.com/attachments/608711487325995008/1018159112174960722/IMG-20211219-WA0018.jpg",
      "https://cdn.discordapp.com/attachments/608711487325995008/1018158867374419968/fae0bc26b3c5e337a5152eefe172b04c.jpg",
      "https://cdn.discordapp.com/attachments/608711487325995008/1018158866602676305/IMG_4036.jpg",
      "https://cdn.discordapp.com/attachments/608711487325995008/1018158866019667988/fedf2e14a5e85cc10a31b6115f1f6dec.jpg",
      "https://cdn.discordapp.com/attachments/608711487325995008/1018158865579253861/images_4.jpg",
      "https://cdn.discordapp.com/attachments/608711487325995008/1018158795844755476/ece2f63fe78b11075e1c846efaa1f661.jpg",
      "https://cdn.discordapp.com/attachments/608711487325995008/1018158795572133969/crop.jpg",
      "https://cdn.discordapp.com/attachments/608711487325995008/1018158722490568714/c5ccfb47b7378e295a4d763dca99b844.jpg",
      "https://cdn.discordapp.com/attachments/608711487325995008/1018158721697845399/Avatar_24.png",
      "https://cdn.discordapp.com/attachments/608711487325995008/1018158721442001017/Avatar_26.png",
      "https://cdn.discordapp.com/attachments/608711487325995008/1019328930345394196/Screenshot_20220820_223448.jpg",
      "https://cdn.discordapp.com/attachments/608711487325995008/1019328053618409602/912bb4e363bce997239acb16241a8cbc.jpg",
      "https://cdn.discordapp.com/attachments/608711487325995008/1019326263552385024/1a08260fec87bbf580594edba7ff5f90.jpg",
      "https://cdn.discordapp.com/attachments/608711487325995008/1019612827562029087/3590e741680dfc2430828aa1b3e1b9ad.jpg",
      "https://cdn.discordapp.com/attachments/608711485849337856/1019662778497236992/unknown.png",
    ];

    const animegifs = [
      "https://cdn.discordapp.com/attachments/608711485849337856/1018263019224051722/a_874eeb773b56296044cbd2ca06312925.gif",
      "https://cdn.discordapp.com/attachments/608711485849337856/1018263021358948417/a_6d0b6cfa566d67b5e386cd9effd9bbf0.gif",
      "https://cdn.discordapp.com/attachments/608711485849337856/1018263027105153054/a_bc8397a09527ebce4029151d0bf212a0.gif",
      "https://cdn.discordapp.com/attachments/608711485849337856/1018263031655972864/a_c87b37c697db3b6ea68021cff251d6f8.gif",
      "https://cdn.discordapp.com/attachments/608711485849337856/1018263041781014599/a_cfb53c1d169b0565e912a4167b78ecf5.gif",
      "https://cdn.discordapp.com/attachments/608711485849337856/1018309682848354404/d4b22bf78ff3c0783b7cd27da14247a7.gif",
      "https://cdn.discordapp.com/attachments/608711485849337856/1018476312245043220/a_50cdf5f3f6bd6470c90edbbc8ff44983.gif",
      "https://cdn.discordapp.com/attachments/608711485849337856/1018855756956717127/1464199626-f0f25477aefb1699b983a5a460c2b12a.gif",
      "https://cdn.discordapp.com/attachments/608711485849337856/1018513399036002314/68809b2508330d3eb74c354fde075270.gif",
      "https://cdn.discordapp.com/attachments/608711485849337856/1018513397131784202/3d6eeea19b1ca264de148652480d8cd6.gif",
      "https://cdn.discordapp.com/attachments/608711485849337856/1018491398158307438/yoriichi.gif",
      "https://cdn.discordapp.com/attachments/608711485849337856/1019369714692149288/0e5465cb74798e4c9105d3b954e6c23f.gif",
      "https://cdn.discordapp.com/attachments/608711485849337856/1019340426563559444/6a2330e2ed77ec9df2075b222e5aa87f.gif",
      "https://cdn.discordapp.com/attachments/608711485849337856/1019268454219534416/unknown.png",
      "https://cdn.discordapp.com/attachments/608711485849337856/1019589246757117982/OldDiratex.gif",
      "https://cdn.discordapp.com/attachments/608711485849337856/1019458139025850478/69d4941f7fcc091c66b596e336e7b39e.gif",
    ];

    const embed = new EmbedBuilder()
      .setDescription("Use Buttons For Boys Random Pfps / Gifs")
      ;

    const row = new ActionRowBuilder().addComponents([
      new ButtonBuilder()
        .setCustomId("pfps")
        .setLabel("Pfps")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId("gifs")
        .setLabel("Gifs")
        .setStyle(ButtonStyle.Secondary),
    ]);

    const msg = await message.channel.send(v2({
      embeds: [embed],
      components: [row],
    }));

    const collector = msg.createMessageComponentCollector({
      filter: (i) => {
        if (i.user.id === message.author.id) return true;
        i.reply(v2({
          content: `${client.emoji.cross} | That's not your session! Run \`${prefix}boys\` to create your own.`,
          flags: MessageFlags.Ephemeral,
        }));
        return false;
      },
      time: 60000,
    });

    collector.on("collect", async (interaction) => {
      const isPfp = interaction.customId === "pfps";
      const collection = isPfp ? animepfps : animegifs;
      const randomImage =
        collection[Math.floor(Math.random() * collection.length)];

      const responseEmbed = new EmbedBuilder()
        .setDescription("Use Buttons For Pfps / Gifs")
        .setImage(randomImage)
        
        .setTimestamp();

      await interaction.update(v2({ embeds: [responseEmbed], components: [row] }));
    });

    collector.on("end", () => {
      row.components.forEach((btn) => btn.setDisabled(true));
      msg.edit(v2({ components: [row] }));
    });
  },
};
