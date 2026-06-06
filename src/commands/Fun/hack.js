/** @format */

const { v2 } = require("../../utils/v2");

const {
  EmbedBuilder,
  MessageFlags,
  ButtonBuilder,
  ActionRowBuilder,
  ButtonStyle,
} = require("discord.js");

module.exports = {
  name: "hack",
  category: "Fun",
  aliases: ["wizz"],
  cooldown: 3,
  description: "",
  args: false,
  usage: "",
  userPerms: [],
  owner: false,
  execute: async (message, args, client, prefix) => {
    const eMails = [
      "epicgamer@pogmail.com",
      "jakob35@hotmail.com",
      "hermann.durgan@yahoo.com",
      "preston8@gmail.com",
      "annie.bogisich87@gmail.com",
      "katherine.ondricka@gmail.com",
      "kara30@gmail.com",
      "hazle.towne99@hotmail.com",
      "brennan48@yahoo.com",
      "darby_marquardt@gmail.com",
      "hailey_pacocha12@hotmail.com",
      "idella.harris70@hotmail.com",
      "kari50@yahoo.com",
      "dexter69@gmail.com",
      "vallie21@gmail.com",
      "roselyn.rohan52@yahoo.com",
      "margarett.koss19@hotmail.com",
      "madge48@yahoo.com",
      "hilbert75@hotmail.com",
      "kevin_terry@yahoo.com",
      "jackeline9@hotmail.com",
      "sugon.deez@nuts.com",
      "nevergonnagive@you.up",
      "animegirls@weirdo.au",
      "orangutan@pog.com",
      "amogus@sus.red",
      "lookin.thick@pogmail.com",
    ];

    const tokens = [
      "ODg4ODIDTY8CfHLPRLMdZdgFDS6.YUYcKQ.vBJuSz28A9F40e311cjArcACB13",
      "ODg4ODI75Fa6rihKzxG1i4MW.YUYcgR.yRrghd0MpGN357EvhZSzbfFMHIt",
      "ODDFOFXUpgf7yEntul5ockCA.OFk6Ph.lFsmsA54bT0Fux1IpsYvey5XuZk04",
      "MTdqrd0vGDV1dcF0QPjom6OB.NQxUhj.I4JjFHIympR3mVF3UiUbbD5VVbi",
      "NTzQvPcLBacBmgajXQc7QAaU.XCgboz.c4t51kFWSEmdmaPnKoyUuu8E78E",
      "ODg4ODIpftCtduDVn9ovf4hx.YUYCZR.zCxfr5EtOBFxBRXg5hf8iptHUGa",
      "ODg4ODI34Xr3DASnsAO23WWORG.YUYpSl.zuNe6XlQDncgNuEun5x0TXH4SMi",
      "ODg4ODIeeFKwpWGodlRb78Mc.YUYuHB.gU0vbnO25ecW68RBJrEkEpBk38m",
      "ODg4ODI8gyrRRkMyq8bJodof.YUYNPV.RsPfA2xHXUlHlEPnVPHfsVGkBqD14",
      "ODg4ODIXnlefsTzNsj4bT2r8XP.YUYwGE.5wNaDsobAKlknnMrHuArua92L4t",
      "ODg4ODIhyhS5G4V8lvkkHeOB.YUYsbc.U812EbUPXWARWAVmACf3dsa24dFr9XOH",
      "ODg4ODIt7QWMYeXV1dzlwgkK.YUYkat.PIuhzfS0JIsXCbfsfKiHzvbV9pimvo",
      "ODg4ODIkioBzAvWYfdsNJogrftv.YUYgkB.6VRGErSJ7z16SMfMZ8YWIcCUTl6",
    ];

    const fakeIp = [
      "86.149.135.38",
      "238.141.214.138",
      "254.33.145.81",
      "18.220.169.156",
      "142.54.147.130",
      "167.250.153.87",
      "49.23.18.23",
      "11.73.29.40",
      "19.245.38.232",
      "27.10.197.57",
      "7.204.207.114",
      "70.187.232.1",
      "176.200.178.187",
      "50.248.137.207",
      "24.172.186.185",
      "42.191.195.48",
      "212.39.68.132",
      "139.172.145.20",
      "133.41.110.149",
      "66.17.187.242",
    ];

    const tokenzRandom = Math.floor(Math.random() * tokens.length);
    const emailRandom = Math.floor(Math.random() * eMails.length);
    const aipRandom = Math.floor(Math.random() * fakeIp.length);
    const password =
      Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);

    const taggedUser = message.mentions.users.first();
    if (!taggedUser) {
      return message.channel.send(v2("Please mention somebody to hack!"));
    }

    const embed = new EmbedBuilder()
      .setTitle(`${taggedUser.tag} Hacked By ${message.author.username}`)
      .setDescription(
        `**__User's Details!__**\n\n> ${client.emoji.dot} Ip: ${fakeIp[aipRandom]}\n> ${client.emoji.dot} Email: ${eMails[emailRandom]}\n> ${client.emoji.dot} Password: ${password}\n> ${client.emoji.dot} Token: ${tokens[tokenzRandom]}`,
      )
      
      .setThumbnail(taggedUser.displayAvatarURL({ dynamic: true }));

    const mee = await message.channel.send(
      v2(`Hacking **${taggedUser.displayName}**... ${client.emoji.loading}`),
    );

    setTimeout(() => {
      mee.edit(v2({
        content: `Successfully hacked **${taggedUser.tag}**! Fetching Information...`,
      }));

      setTimeout(() => {
        mee.edit(v2({ content: " ", embeds: [embed] }));
      }, 1000);
    }, 600);
  },
};
