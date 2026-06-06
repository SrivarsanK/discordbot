function isBotOwner(client, userId) {
  if (!userId) return false;
  return syncClientOwnerIds(client).includes(String(userId).trim());
}

function syncClientOwnerIds(client) {
  const ids = [
    client?.owner,
    client?.config?.ownerID,
    ...(Array.isArray(client?.owners) ? client.owners : []),
    ...(Array.isArray(client?.config?.owners) ? client.config.owners : []),
    client?.config?.app?.backupUserId,
    process.env.OWNER_ID,
    ...(process.env.OWNER_IDS || "").split(","),
    process.env.BACKUP_USER_ID,
    ...getApplicationOwnerIds(client),
  ]
    .map(normalizeId)
    .filter(Boolean);

  const uniqueIds = [...new Set(ids)];
  if (client) {
    client.owners = uniqueIds;
    client.owner = normalizeId(client.owner) || uniqueIds[0] || null;
  }

  return uniqueIds;
}

async function refreshApplicationOwners(client) {
  await client.application?.fetch().catch(() => null);
  return syncClientOwnerIds(client);
}

function getApplicationOwnerIds(client) {
  const owner = client?.application?.owner;
  if (!owner) return [];

  const ids = [];
  if (owner.id) ids.push(owner.id);

  const members = owner.members;
  if (members?.map) {
    ids.push(...members.map((member) => member.user?.id || member.id));
  } else if (Array.isArray(members)) {
    ids.push(...members.map((member) => member.user?.id || member.id));
  }

  return ids;
}

function normalizeId(value) {
  if (value === null || value === undefined) return null;
  const match = String(value).trim().match(/\d{15,25}/);
  return match?.[0] || null;
}

module.exports = {
  isBotOwner,
  refreshApplicationOwners,
  syncClientOwnerIds,
};
