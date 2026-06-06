const Premium = require("../schema/premium");

let repairPromise = null;
let indexesRepaired = false;

async function repairPremiumIndexes(logger) {
  if (indexesRepaired) return;
  if (repairPromise) return repairPromise;

  repairPromise = runRepair(logger)
    .then(() => {
      indexesRepaired = true;
    })
    .catch((error) => {
      logger?.log?.(
        `[Premium] Index repair failed: ${error.stack || error}`,
        "error",
      );
    })
    .finally(() => {
      repairPromise = null;
    });

  return repairPromise;
}

async function runRepair(logger) {
  if (Premium.db.readyState !== 1) return;

  let indexes = [];
  try {
    indexes = await Premium.collection.indexes();
  } catch (error) {
    if (error?.codeName !== "NamespaceNotFound" && error?.code !== 26) {
      throw error;
    }
  }

  const staleIndexes = indexes.filter((index) => index?.key?.userId);
  for (const index of staleIndexes) {
    try {
      await Premium.collection.dropIndex(index.name);
      logger?.log?.(`[Premium] Dropped stale Mongo index ${index.name}.`, "warn");
    } catch (error) {
      if (error?.codeName !== "IndexNotFound" && error?.code !== 27) {
        throw error;
      }
    }
  }

  await Premium.createIndexes();
}

module.exports = { repairPremiumIndexes };
