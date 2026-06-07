const { v2 } = require("./v2");
const Noprefix = require("../schema/noprefix");
const VoteBypassUser = require("../schema/votebypassuser");

async function cleanExpiredPermissions(client) {
  try {
    await cleanCollection(client, Noprefix, "NoPrefix Premium");
    await cleanCollection(client, VoteBypassUser, "Vote Bypass");
  } catch (error) {
    client.logger?.log(
      `[PremiumChecks] Cleanup failed: ${error.stack || error}`,
      "error",
    );
  }
}


async function cleanCollection(client, model, label) {
  const expiredEntries = await model.find({ expiresAt: { $lt: new Date() } });

  for (const entry of expiredEntries) {
    try {
      const user = await client.users.fetch(entry.userId).catch(() => null);
      if (user) {
        await user
          .send(
            v2(`Hello **${user.username}**, your **${label}** access has expired.`),
          )
          .catch(() => null);
      }
    } finally {
      await model.deleteOne({ _id: entry._id });
      client.logger?.log(
        `[PremiumChecks] Removed expired ${label} for ${entry.userId}.`,
        "log",
      );
    }
  }
}

function initializePremiumChecks(client) {
  if (!client || client._premiumCleanupInterval) return;

  cleanExpiredPermissions(client);
  client._premiumCleanupInterval = setInterval(
    () => cleanExpiredPermissions(client),
    60 * 1000,
  );
  client.logger?.log("[PremiumChecks] Cleanup initialized.", "ready");
}

module.exports = initializePremiumChecks;
