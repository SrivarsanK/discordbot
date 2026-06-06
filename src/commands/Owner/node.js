const { v2 } = require("../../utils/v2");
module.exports = {
  name: "node",
  category: "Information",
  description: "xD node information.",
  botPrams: ["EMBED_LINKS"],
  args: false,
  usage: "",
  userPerms: [],
  owner: true,
  cooldown: 3,
  execute: async (message, args, client, prefix) => {
    //  `**Node ${(node.options.identifier)} Connected**` +
    const all = [...client.manager.shoukaku.nodes.values()]
      .map(
        (node) =>
          `Node is ${node.stats ? "Connected" : "Disconnected"}` +
          `\nPlayer: ${node.stats.players}` +
          `\nPlaying Players: ${node.stats.playingPlayers}` +
          `\nUptime: ${new Date(node.stats.uptime).toISOString().slice(11, 19)}` +
          `\n\nMemory` +
          `\nReservable Memory: ${Math.round(node.stats.memory.reservable / 1024 / 1024)}mb` +
          `\nUsed Memory: ${Math.round(node.stats.memory.used / 1024 / 1024)}mb` +
          `\nFree Memory: ${Math.round(node.stats.memory.free / 1024 / 1024)}mb` +
          `\nAllocated Memory: ${Math.round(node.stats.memory.allocated / 1024 / 1024)}mb` +
          `\n\nCPU` +
          `\nCores: ${node.stats.cpu.cores}` +
          `\nSystem Load: ${(Math.round(node.stats.cpu.systemLoad * 100) / 100).toFixed(2)}%` +
          `\nLavalink Load: ${(Math.round(node.stats.cpu.lavalinkLoad * 100) / 100).toFixed(2)}%`,
      )
      .join("\n\n----------------------------\n");

    const embed = new client.embed()
      .setAuthor({
        name: "Lavalink Node",
        iconURL: client.user.displayAvatarURL(),
      })
      .d(`\`\`\`${all ? all : "Node: Disconnected"}\`\`\``);
    message.reply(v2({ embeds: [embed] }));
  },
};
