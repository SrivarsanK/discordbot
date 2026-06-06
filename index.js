const { Collection } = require("discord.js");
const { Api } = require("@top-gg/sdk");
const Dokdo = require("dokdo");
const MusicBot = require("./src/structures/MusicClient");
const Util = require("./src/utils/util");

const client = new MusicBot();

client.util = new Util(client);
client.userSettings = new Collection();
client.color = client.config.color || client.config.embedColor;
client.emoji = client.config.emojis || client.emoji || {};

client.Jsk = new Dokdo.Client(client, {
  aliases: ["dokdo", "dok", "jsk"],
  prefix: client.config.dokdo?.prefix,
  owners: client.config.dokdo?.owners || client.config.owners,
});

const topggToken = client.config.topggToken || client.config.topgg;
if (topggToken) {
  client.topgg = new Api(topggToken);
}

process.env.SHELL = process.platform === "win32" ? "powershell" : "bash";

module.exports = client;

client.on("messageCreate", (message) => {
  client.Jsk.run(message);
});

client.connect();

process.on("unhandledRejection", (reason, p) => {
  console.log(reason, p);
});

process.on("uncaughtException", (err, origin) => {
  console.log(err, origin);
});

process.on("uncaughtExceptionMonitor", (err, origin) => {
  console.log(err, origin);
});
