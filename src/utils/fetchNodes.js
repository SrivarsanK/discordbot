const axios = require("axios");
const net = require("net");

function pingHost(host, port, timeout = 2500) {
  return new Promise((resolve) => {
    const start = Date.now();
    const socket = new net.Socket();
    
    socket.setTimeout(timeout);
    
    socket.connect(port, host, () => {
      const latency = Date.now() - start;
      socket.destroy();
      resolve(latency);
    });
    
    socket.on("error", () => {
      socket.destroy();
      resolve(Infinity);
    });
    
    socket.on("timeout", () => {
      socket.destroy();
      resolve(Infinity);
    });
  });
}

async function fetchBestNodes(client, maxNodes = 5) {
  client.logger.log("[Music] Resolving best Lavalink v4 nodes...", "log");
  
  const nodes = [];
  
  // 1. Load custom nodes configured in config.js (including .env primary node)
  if (client.config.nodes) {
    for (const node of client.config.nodes) {
      if (node && node.url) {
        const parts = node.url.split(":");
        const host = parts[0];
        const port = parseInt(parts[1] || (node.secure ? "443" : "80"), 10);
        nodes.push({
          url: node.url,
          host,
          port,
          name: node.name || `Configured-${host}`,
          auth: node.auth || "youshallnotpass",
          secure: !!node.secure
        });
      }
    }
  }

  // 2. Fetch public nodes from AjieBlogs API
  try {
    const response = await axios.get("https://lavalink-list.ajieblogs.eu.org/All", { timeout: 8000 });
    if (Array.isArray(response.data)) {
      client.logger.log(`[Music] Successfully retrieved ${response.data.length} public nodes from API.`, "log");
      for (const item of response.data) {
        // Only target v4 nodes that are formatted correctly
        if (item.version === "v4" && item.host && item.port) {
          nodes.push({
            url: `${item.host}:${item.port}`,
            host: item.host,
            port: parseInt(item.port, 10),
            name: item.identifier || item["unique-id"] || `Public-${item.host}`,
            auth: item.password || "youshallnotpass",
            secure: !!item.secure
          });
        }
      }
    }
  } catch (err) {
    client.logger.log(`[Music] Failed to fetch public nodes: ${err.message}. Using configured fallback nodes.`, "warn");
  }

  // 3. Deduplicate nodes by URL
  const seenUrls = new Set();
  const dedupedNodes = [];
  for (const n of nodes) {
    const lowerUrl = n.url.toLowerCase();
    if (!seenUrls.has(lowerUrl)) {
      seenUrls.add(lowerUrl);
      dedupedNodes.push(n);
    }
  }

  // 4. Test latency of all nodes in parallel
  client.logger.log(`[Music] Testing connection strength of ${dedupedNodes.length} unique nodes...`, "log");
  const testedNodes = await Promise.all(
    dedupedNodes.map(async (node) => {
      const latency = await pingHost(node.host, node.port);
      return { ...node, latency };
    })
  );

  // 5. Filter online nodes and sort by connection strength (lowest latency first)
  const workingNodes = testedNodes
    .filter(n => n.latency < Infinity)
    .sort((a, b) => a.latency - b.latency);

  if (workingNodes.length === 0) {
    client.logger.log("[Music] WARNING: No working Lavalink nodes found! Bot will fall back to local configuration without validation.", "warn");
    return client.config.nodes || [];
  }

  client.logger.log(`[Music] Found ${workingNodes.length} active Lavalink nodes. Selecting top ${Math.min(maxNodes, workingNodes.length)}:`, "ready");
  workingNodes.slice(0, maxNodes).forEach((n, idx) => {
    client.logger.log(`   #${idx + 1}: "${n.name}" (${n.url}) | Latency: ${n.latency}ms`, "ready");
  });

  return workingNodes.slice(0, maxNodes).map(n => ({
    url: n.url,
    name: n.name,
    auth: n.auth,
    secure: n.secure
  }));
}

module.exports = { fetchBestNodes };
