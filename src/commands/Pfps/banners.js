const { v2 } = require("../../utils/v2");
const {
  EmbedBuilder,
  MessageFlags,
  ButtonBuilder,
  ActionRowBuilder,
  ButtonStyle,
} = require("discord.js");

module.exports = {
  name: "banners",
  category: "Pfp",
  aliases: ["banners"],
  cooldown: 3,
  description: "Sends a random banner from a list of provided links",
  execute: async (message, args, client, prefix) => {
    const embed = new EmbedBuilder()
      .setDescription("Use the button below to get a random banner!")
      ;

    const banners = [
      "https://cdn.discordapp.com/attachments/857714045251878972/1018592538124353548/cd0a0d4d16c35195cf26ace01a851102.gif",
      "https://cdn.discordapp.com/attachments/857714065710776320/1019245541374308412/images_6.jpg",
      "https://cdn.discordapp.com/attachments/857714065710776320/1018919376424030429/bb0402088285fbf46d0b83c67b258f11.jpg",
      "https://cdn.discordapp.com/attachments/857714065710776320/1018919376143003678/e3d279fe5494844260e4e2fdf072c14d.jpg",
      "https://cdn.discordapp.com/attachments/857714065710776320/1018748387878785094/f853e9172f088d5ffa135ebab82db238.png",
      "https://cdn.discordapp.com/attachments/857714065710776320/1018748387404808222/16453dbb8705d1c8bbf8318f8aa22d73.jpg",
      "https://cdn.discordapp.com/attachments/857714065710776320/1019331744350076928/18b66c364182a6e2f31165658013a483.jpg",
      "https://cdn.discordapp.com/attachments/857714065710776320/1019309957398667325/376415e614690f84e92b6c1709ddfcea.jpg",
      "https://cdn.discordapp.com/attachments/857714065710776320/1019306462478078022/66b1ac8d481fd2f0ca6d8a13cc719dd9.jpg",
      "https://cdn.discordapp.com/attachments/857714065710776320/1019305603392356443/65ab7531f98ab43cfdb69d7a0f0ff7bb.jpg",
      "https://cdn.discordapp.com/attachments/857714065710776320/1019302199584632873/326821a3ff9fe82dc04f7a2fb40ac34f.jpg",
      "https://cdn.discordapp.com/attachments/857714065710776320/1019302188494884924/0bf4e7de34095cc058de8c1557d1d6e2.jpg",
      "https://cdn.discordapp.com/attachments/857714065710776320/1019301900052615268/5753814cceed2b09315b75920df7125f.jpg",
      "https://cdn.discordapp.com/attachments/857714065710776320/1019301880037392494/7ed5f4c66f8e64e55ea5ecba83ec1a25.jpg",
      "https://cdn.discordapp.com/attachments/857714065710776320/1019301874391863316/6ccbfa66ea4a8a186345df6deebd99b5.jpg",
      "https://cdn.discordapp.com/attachments/857714065710776320/1019301868834398319/d0a456f5cb808b972d1bc4369f1e5daa.jpg",
      "https://cdn.discordapp.com/attachments/857714065710776320/1019301864187121714/c4a716a12a0e77da8c6d53b3d6e9f403.jpg",
      "https://cdn.discordapp.com/attachments/857714065710776320/1019301842439643256/b231ee360c213b76286362eb83ff410c.jpg",
      "https://cdn.discordapp.com/attachments/857714045251878972/1019312310474510358/Anka_Code_Girl_Banner_2.gif",
      "https://cdn.discordapp.com/attachments/857714045251878972/1019302079405232218/7c750b26d3d563f1b1affba930c91d4b.gif",
      "https://cdn.discordapp.com/attachments/857714045251878972/1019302076859289659/6cca2105bc742f38dfaa713a3f4276bf.gif",
      "https://cdn.discordapp.com/attachments/857714045251878972/1019302003123441744/950b2c0d071d0ebddac74b1c56cd9913.gif",
      "https://cdn.discordapp.com/attachments/857714045251878972/1019301995418484796/c6242842fe5ee3d67d3b1839dfb0c31e.gif",
      "https://cdn.discordapp.com/attachments/857714045251878972/1019729036190167090/d80eb3916a578456d5d8114a58c84e7b.gif",
      "https://cdn.discordapp.com/attachments/857714045251878972/1019685305990795398/a_efa044c29baf083b2fd19c6c79b36850.gif",
      "https://cdn.discordapp.com/attachments/857714045251878972/1019660928272310283/unknown.png",
      "https://cdn.discordapp.com/attachments/857714045251878972/1019518362285506611/original.gif",
      "https://cdn.discordapp.com/attachments/857714045251878972/1019503558078500874/d7d95c534c9fa8cb16a5b1270cf6ad33.gif",
      "https://cdn.discordapp.com/attachments/768864615676903466/1019727499845959761/a_2386c681f1aea4c4ce5b506c90073613.gif",
      "https://cdn.discordapp.com/attachments/768864495522283560/1019712202418171914/cachedImage.png",
      "https://cdn.discordapp.com/attachments/768864495522283560/1019699791908839445/unknown.png",
      "https://cdn.discordapp.com/attachments/768864495522283560/1019697848842993815/488b7266a37efcc9aebea279f3496dde.png",
    ];

    const row = new ActionRowBuilder().addComponents([
      new ButtonBuilder()
        .setCustomId("banners")
        .setLabel("Banners")
        .setStyle(ButtonStyle.Secondary),
    ]);

    const msg = await message.channel.send(v2({
      embeds: [embed],
      components: [row],
    }));

    const collector = msg.createMessageComponentCollector({
      filter: (i) => {
        if (message.author.id === i.user.id) return true;
        i.reply(v2({
          content: `${client.emoji.cross} | That's not your session. Run \`${prefix}banners\` to create your own.`,
          flags: MessageFlags.Ephemeral,
        }));
        return false;
      },
      time: 60000, // Collector runs for 60 seconds
    });

    collector.on("collect", async (i) => {
      if (i.customId === "banners") {
        const randomIndex = Math.floor(Math.random() * banners.length);
        const randomBanner = banners[randomIndex];

        const updatedEmbed = new EmbedBuilder()
          .setDescription("Here is your random banner! 🎉")
          .setImage(randomBanner)
          
          .setTimestamp();

        await i.update(v2({ embeds: [updatedEmbed], components: [row] }));
      }
    });

    collector.on("end", () => {
      row.components[0].setDisabled(true); // Disables the button after time ends
      msg.edit(v2({ components: [row] }));
    });
  },
};
