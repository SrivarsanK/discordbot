const { v2 } = require("../../utils/v2");
const {
  EmbedBuilder,
  MessageFlags,
  ButtonBuilder,
  ActionRowBuilder,
  ButtonStyle,
} = require("discord.js");

module.exports = {
  name: "boys",
  category: "Pfp",
  cooldown: 3,
  aliases: ["boys"],
  description: "Sends a random profile picture or gif from a list of links.",
  execute: async (message, args, client, prefix) => {
    const boyspfps = [
      "https://cdn.discordapp.com/attachments/608711478496854019/1018153780786774097/images_24.jpg",
      "https://cdn.discordapp.com/attachments/608711478496854019/1018153202975244379/98f0d329ea4452cbc51d45cde2601da2.jpg",
      "https://cdn.discordapp.com/attachments/608711478496854019/1018122035316150342/unknown.png",
      "https://cdn.discordapp.com/attachments/608711478496854019/1018121781036466226/unknown.png",
      "https://cdn.discordapp.com/attachments/608711478496854019/1018121729211629688/unknown.png",
      "https://cdn.discordapp.com/attachments/608711478496854019/1018121698165395566/unknown.png",
      "https://cdn.discordapp.com/attachments/608711478496854019/1018121684768788542/unknown.png",
      "https://cdn.discordapp.com/attachments/608711478496854019/1018121647074586654/unknown.png",
      "https://cdn.discordapp.com/attachments/608711478496854019/1018121647074586654/unknown.png",
      "https://cdn.discordapp.com/attachments/608711478496854019/1018121638778241084/unknown.png",
      "https://cdn.discordapp.com/attachments/608711478496854019/1018121620247814144/unknown.png",
      "https://cdn.discordapp.com/attachments/608711478496854019/1018121602254245908/unknown.png",
      "https://cdn.discordapp.com/attachments/608711478496854019/1018121572017508402/unknown.png",
      "https://cdn.discordapp.com/attachments/608711478496854019/1018121552568516652/unknown.png",
      "https://cdn.discordapp.com/attachments/608711478496854019/1018121536525324288/unknown.png",
      "https://cdn.discordapp.com/attachments/608711478496854019/1018121463422787625/unknown.png",
      "https://cdn.discordapp.com/attachments/608711478496854019/1018121448700772382/unknown.png",
      "https://cdn.discordapp.com/attachments/608711478496854019/1018051616756219916/5dc823c5bb21cdc63dac7dd86ec93d2f.jpg",
      "https://cdn.discordapp.com/attachments/608711478496854019/1018051616550703124/55f724042e6c9a8cffdf896a75835adf.jpg",
      "https://cdn.discordapp.com/attachments/608711478496854019/1018051616328396810/55981e6682c262aea523fcdada48e07d.jpg",
      "https://cdn.discordapp.com/attachments/608711478496854019/1019502062255484938/fc35beb42bd3d58546765fcbb37e9675.jpg",
      "https://cdn.discordapp.com/attachments/608711478496854019/1019502061802504192/aa623fb85df127a7d0788adb7afad424.jpg",
      "https://cdn.discordapp.com/attachments/608711478496854019/1019501988410572821/9879d6ae061333c7c3345ef01925a610.jpg",
      "https://cdn.discordapp.com/attachments/608711478496854019/1019501987877896232/15aeb18b8eb8c568ae465fc79d193de7.jpg",
      "https://cdn.discordapp.com/attachments/1089605187037044829/1120237005368991824/a5eed67cbabf819cc09914a2b2587e86.jpg?ex=65488603&is=65361103&hm=536a553fe8a130785be37f34780934c0413d826f1a7e9b39b3768b58b099dee1&",
      "https://cdn.discordapp.com/attachments/1089605187037044829/1120237256318394388/9dfeb0e52d1d6eabbcb46111d089e047.jpg?ex=6548863e&is=6536113e&hm=d7fd0f7010bca2a4b9cd676bb689f5cb621234632921c74828970a5fc334084a&",
      "https://cdn.discordapp.com/attachments/1168149746406391888/1168190028216799413/f6b17a1e091f1a48e43e2b682f133a77.jpg?ex=656351be&is=6550dcbe&hm=636baf9fedc559e3750a334fae90e3552e4b90f257062f8fde728e99b3592ccd&",
      "https://cdn.discordapp.com/attachments/1168149746406391888/1168190039042297946/17034cb5fe63839e0358cb6f5cb561f1.jpg?ex=656351c1&is=6550dcc1&hm=142f5f16d877d13621a14cd1f59ba5e341c155ca3eb8b747bf0f82ef89a71f73&",
      // Add more pfp links as needed
    ];

    const boysgifs = [
      "https://cdn.discordapp.com/attachments/608711476219478045/1018151755273474110/a_67d61390265cb7294137ab700b327755.gif",
      "https://cdn.discordapp.com/attachments/608711476219478045/1018151757743923341/a_af347fce39d2a0640e672ffbad797a7a.gif",
      "https://cdn.discordapp.com/attachments/608711476219478045/1019186587180990514/a_4fbe6403d85f03bcd428ac52a04b1731.gif",
      "https://cdn.discordapp.com/attachments/608711476219478045/1019190886602641438/a_440717d1a0682299b382721985e3ab44.gif",
      "https://cdn.discordapp.com/attachments/608711476219478045/1019190951064907847/a_580331609d1dbae6f8a924a5ccd1bc1a.gif",
      "https://cdn.discordapp.com/attachments/608711476219478045/1019191001824366592/a_9216e2285cf4662ec0278926521258e9.gif",
      "https://cdn.discordapp.com/attachments/608711476219478045/1019191048423100456/a_5629581e37281c6098d325673f40a75d.gif",
      "https://cdn.discordapp.com/attachments/608711476219478045/1019191077506396170/a_fe6fbe3cec2fccbff3c71ccb6d0c9f9a.gif",
      "https://cdn.discordapp.com/attachments/608711476219478045/1019191111085998110/a_81aa4b9a7bacd5d3937b7273be9ffbcd.gif",
      "https://cdn.discordapp.com/attachments/608711476219478045/1019191143545704528/a_5bc7210b892a6534e8a7c6a5b9a0a0d8.gif",
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
      const collection = isPfp ? boyspfps : boysgifs;
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
