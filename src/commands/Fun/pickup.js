const { v2 } = require("../../utils/v2");
const { EmbedBuilder } = require("discord.js");

module.exports = {
  name: "pickup",
  description: "Give a random pickup",
  category: "Fun",
  aliases: ["pp"],
  cooldown: 3,
  args: false,
  usage: "",
  userPerms: [],
  owner: false,
  execute(message, args, client, prefix) {
    const pickup = [
      "Hey baby are you allergic to dairy cause I **laktose** clothes you're wearing",
      "I’m not a photographer, but I can **picture** me and you together.",
      "I seem to have lost my phone number. Can I have yours?",
      "Hey babe are you a cat? Because I'm **feline** a connection between us.",
      "Are you French? Because **Eiffel** for you.",
      "Baby, life without you is like a broken pencil... **pointless**.",
      "If I could rearrange the alphabet, I would put **U** and **I** together.",
      "Is your name Google? Because you're everything I'm searching for.",
      "Are you from Starbucks? Because I like you a **latte**.",
      "Are you a banana? Because I find you **a peeling**.",
      "Are you a teapot? Because I like your **steamed** drink.",
      "Babe did it hurt when you fell from heaven?",
      "Is your name Wi-Fi? Because I'm feeling a connection.",
      "Are you Australian? Because you meet all of my **koala**fications.",
      "If I were a cat I'd spend all 9 lives with you.",
      "My love for you is like dividing by 0. It's undefinable.",
      "Take away gravity, I'll still fall for you.",
      "Are you a criminal? Because you just stole my heart.",
      "Hey babe I'm here. What were your other two wishes?",
    ];
    const randomPickup = pickup[Math.floor(Math.random() * pickup.length)];
    message.channel.send(v2({
      embeds: [
        new EmbedBuilder()
          
          .setTitle(`Here is Your PickUp Line:`)
          .setDescription(`${randomPickup}`),
      ],
    }));
  },
};
