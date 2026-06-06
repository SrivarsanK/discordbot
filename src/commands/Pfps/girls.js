const { v2 } = require("../../utils/v2");
const {
  EmbedBuilder,
  MessageFlags,
  ButtonBuilder,
  ActionRowBuilder,
  ButtonStyle,
} = require("discord.js");

module.exports = {
  name: "girls",
  category: "Pfp",
  cooldown: 3,
  aliases: ["girls"],
  description: "Sends a random profile picture or gif from a list of links.",
  execute: async (message, args, client, prefix) => {
    const girlpfps = [
      "https://cdn.discordapp.com/attachments/608711481969868811/1019199430353764412/20220913_125743.jpg",
      "https://cdn.discordapp.com/attachments/608711481969868811/1018526535881326633/unknown.png",
      "https://cdn.discordapp.com/attachments/608711481969868811/1018414869881557032/c46790afdfa2d8fc21c22368a0261307.jpg",
      "https://cdn.discordapp.com/attachments/608711481969868811/1018414869583773776/adcbdda4b721271e9dc01465415bd160.jpg",
      "https://cdn.discordapp.com/attachments/608711481969868811/1018414868598112369/7ffbac1b3919b476524f349820e90a39.jpg",
      "https://cdn.discordapp.com/attachments/608711481969868811/1018414868262572072/ac2721a2fddb53766bfd3fa0d363a1cc.jpg",
      "https://cdn.discordapp.com/attachments/608711481969868811/1018414867910230016/a52d5c65ad6640b0cd15e668d0d4af3c.jpg",
      "https://cdn.discordapp.com/attachments/608711481969868811/1018291162374737971/f3b6a974fcd6ea684b7ff85ec69a3707.jpg",
      "https://cdn.discordapp.com/attachments/608711481969868811/1018291162156630036/0771d7b1728c11414e3b940bb7d3d792.jpg",
      "https://cdn.discordapp.com/attachments/608711481969868811/1018291161904984124/af53f31728b2a2647714fac478bf3a70.jpg",
      "https://cdn.discordapp.com/attachments/608711481969868811/1018291161162592286/36f4e7410423a909befba4541acf7f5c.jpg",
      "https://cdn.discordapp.com/attachments/608711481969868811/1018291160881569802/4a7b22f5797eb44ada5dc5141e6622f6.jpg",
      "https://cdn.discordapp.com/attachments/608711481969868811/1018291160151756800/52e07587c6e4d27fe5ababff7bedca54.jpg",
      "https://cdn.discordapp.com/attachments/608711481969868811/1018211053580062820/unknown.png",
      "https://cdn.discordapp.com/attachments/608711481969868811/1018211052867043408/unknown.png",
      "https://cdn.discordapp.com/attachments/608711481969868811/1018211052443406366/unknown.png",
      "https://cdn.discordapp.com/attachments/608711481969868811/1018137854972538991/1662813354402.gif",
      "https://cdn.discordapp.com/attachments/608711481969868811/1018137854569889833/1662813354388.jpg",
      "https://cdn.discordapp.com/attachments/608711481969868811/1018137854272086056/1662813354381.png",
      "https://cdn.discordapp.com/attachments/608711481969868811/1018137854028808212/1662813354372.jpg",
      "https://cdn.discordapp.com/attachments/608711481969868811/1018052114972409957/89b41f16ebf70bf548c8031b476fb191.jpg",
      "https://cdn.discordapp.com/attachments/608711481969868811/1019330043454951554/c441a6db77aa8bb4969285b28e505ee6.jpg",
      "https://cdn.discordapp.com/attachments/608711481969868811/1019330041009684601/0565c8ce1ff527cd13fc377d0a258bbc.jpg",
      "https://cdn.discordapp.com/attachments/608711481969868811/1019739424046727268/d69a75f10c2c99b9be391882eda4b97b.jpg",
      "https://cdn.discordapp.com/attachments/608711481969868811/1019739423820230738/e04e4136c895fb11d9bd06efd2be767d.jpg",
      "https://cdn.discordapp.com/attachments/608711481969868811/1019739423576948867/e2c15399ae880a8150470f80753f86b3.jpg",
      "https://cdn.discordapp.com/attachments/608711481969868811/1019739423346278501/b4848f597885c8d51f0a0477df681844.jpg",
      "https://cdn.discordapp.com/attachments/608711481969868811/1019739423044284546/7f5414eb69d0aa08efdbe6469a3461f2.jpg",
      "https://cdn.discordapp.com/attachments/608711481969868811/1019739422520000573/a709ba6f4b0049f7e1d6f9f9013e8753.jpg",
      "https://cdn.discordapp.com/attachments/608711481969868811/1019676743713435648/SmartSelect_-.png",
      "https://cdn.discordapp.com/attachments/608711481969868811/1019676743449182259/SmartSelect_-_Discord.png",
      "https://cdn.discordapp.com/attachments/608711481969868811/1019676743205933066/SmartSelect_-_Discord.png",
      "https://cdn.discordapp.com/attachments/608711481969868811/1019676742920704020/SmartSelect_-_Discord.png",
      "https://cdn.discordapp.com/attachments/608711481969868811/1019676742622912572/SmartSelect_-_Discord.png",
      "https://cdn.discordapp.com/attachments/608711481969868811/1019676742379655178/SmartSelect_-_Discord.png",
      "https://cdn.discordapp.com/attachments/608711481969868811/1019675515688325191/c3edeaa85140a5ac21469563d0d4afd1.jpg",
      "https://cdn.discordapp.com/attachments/608711481969868811/1019675515487014952/bff7bc9e26fa1122c4234bdbd0499415.jpg",
    ];

    const girlgifs = [
      "https://cdn.discordapp.com/attachments/608711480346542102/1017580583469207663/hit_gif_6.gif",
      "https://cdn.discordapp.com/attachments/608711480346542102/1018571269093990410/girl_PP_Gif_68.gif",
      "https://cdn.discordapp.com/attachments/608711480346542102/1017822994090950706/a_30ff8b1ad24c4d340061293721bd39e7.gif",
      "https://cdn.discordapp.com/attachments/608711480346542102/1017822775446097960/a_6d874dde08bb02e8b14156c0e71595bf.gif",
      "https://cdn.discordapp.com/attachments/608711480346542102/1017822458285396048/7380DF2C-CF6F-476A-A757-434CA48A3868.gif",
      "https://cdn.discordapp.com/attachments/608711480346542102/1019294573970870303/4a2da082cf8d7339c5d28efea3bf0ae0.gif",
      "https://cdn.discordapp.com/attachments/608711480346542102/1019582919003607100/739e167748e257144756217cf930bad1.gif",
      "https://cdn.discordapp.com/attachments/608711480346542102/1019655115457704016/a_30ff8b1ad24c4d340061293721bd39e7.gif",
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
      const collection = isPfp ? girlpfps : girlgifs;
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
