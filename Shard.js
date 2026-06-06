/** @format */

const config = require("./src/config");
const { ClusterManager } = require("discord-hybrid-sharding");
[
  {
    file: "./index.js",
    token: config.token,
    shards: config.cluster.shardCount,
    perCluster: config.cluster.shardsPerCluster,
  },
].forEach((client) => {
  new ClusterManager(client.file, {
    restarts: {
      max: config.cluster.restartMax,
      interval: config.cluster.restartInterval,
    },
    respawn: config.cluster.respawn,
    mode: config.cluster.mode,
    token: client.token,
    totalShards: client.shards || "auto",
    shardsPerClusters: parseInt(client.perCluster) || 2,
  })
    .on("shardCreate", (cluster) => {
      console.log(`Launched cluster ${cluster.id}`);
    })
    .on("debug", (info) => {
      console.log(`${info}`, "cluster");
    })
    .spawn({ timeout: -1 });
});
