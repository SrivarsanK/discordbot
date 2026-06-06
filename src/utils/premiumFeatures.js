const Premium = require("../schema/premium");
const PremiumLevel = require("../schema/premiumLevel");
const PremiumSettings = require("../schema/premiumSettings");

const settingsCache = new Map();
const premiumCache = new Map();
const CACHE_MS = 30 * 1000;

async function getActivePremium(guildId, userId = null) {
  const candidates = [
    guildId ? { id: guildId, type: "guild" } : null,
    userId ? { id: userId, type: "user" } : null,
  ].filter(Boolean);

  for (const query of candidates) {
    const key = `${query.type}:${query.id}`;
    const cached = premiumCache.get(key);
    if (cached && cached.expires > Date.now()) return cached.value;

    const entry = await Premium.findOne(query);
    const active = entry && entry.isActive() ? entry : null;
    premiumCache.set(key, { value: active, expires: Date.now() + CACHE_MS });
    if (active) return active;
  }

  return null;
}

async function isPremiumEnabled(guildId, userId = null) {
  return Boolean(await getActivePremium(guildId, userId));
}

async function getPremiumSettings(guildId) {
  const cached = settingsCache.get(guildId);
  if (cached && cached.expires > Date.now()) return cached.value;

  const settings = await PremiumSettings.findOneAndUpdate(
    { guildId },
    { $setOnInsert: { guildId } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  settingsCache.set(guildId, { value: settings, expires: Date.now() + CACHE_MS });
  return settings;
}

function clearPremiumSettingsCache(guildId) {
  settingsCache.delete(guildId);
}

function clearPremiumCache(id, type = "guild") {
  premiumCache.delete(`${type}:${id}`);
}

async function awardPremiumXp(guildId, userId, source, amount) {
  const safeAmount = Math.max(0, Math.floor(Number(amount) || 0));
  if (!safeAmount) return null;

  const doc = await PremiumLevel.findOneAndUpdate(
    { guildId, userId },
    {
      $setOnInsert: { guildId, userId },
      $inc: {
        [source === "voice" ? "voiceXp" : "chatXp"]: safeAmount,
        totalXp: safeAmount,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  const nextLevel = levelFromXp(doc.totalXp);
  const previousLevel = doc.level || 0;
  if (nextLevel !== previousLevel) {
    doc.level = nextLevel;
    await doc.save();
  }

  return {
    doc,
    amount: safeAmount,
    levelUp: nextLevel > previousLevel,
    previousLevel,
    level: nextLevel,
  };
}

function levelFromXp(totalXp) {
  return Math.floor(Math.sqrt(Math.max(0, Number(totalXp) || 0) / 150));
}

function formatLevelMessage(template, member, level, guild) {
  return String(template || "{user} reached level {level}.")
    .replaceAll("{user}", `<@${member.id}>`)
    .replaceAll("{username}", member.user?.username || member.displayName || "member")
    .replaceAll("{level}", String(level))
    .replaceAll("{server}", guild?.name || "")
    .replaceAll("{server_name}", guild?.name || "");
}

module.exports = {
  awardPremiumXp,
  clearPremiumCache,
  clearPremiumSettingsCache,
  formatLevelMessage,
  getActivePremium,
  getPremiumSettings,
  isPremiumEnabled,
  levelFromXp,
};
