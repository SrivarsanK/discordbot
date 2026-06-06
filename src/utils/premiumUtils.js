/** @format
 * Premium utility helpers
 */

const { getActivePremium } = require("./premiumFeatures");

/**
 * Get active premium entry for a guild or user.
 * Returns null if none / expired.
 */
async function getPremium(id, type) {
  return getActivePremium(type === "guild" ? id : null, type === "user" ? id : null);
}

/**
 * Check if a guild or user has a specific feature.
 */
async function hasFeature(id, type, feature) {
  const entry = await getPremium(id, type);
  return !!(entry?.features?.[feature]);
}

/**
 * Get the active embed color for a guild (checks guild prem first, then user prem).
 * Falls back to the provided defaultColor.
 */
async function getEmbedColor(guildId, userId, defaultColor) {
  const gPrem = await getPremium(guildId, "guild");
  if (gPrem?.embedColor) return gPrem.embedColor;
  const uPrem = await getPremium(userId, "user");
  if (uPrem?.embedColor) return uPrem.embedColor;
  return defaultColor;
}

module.exports = { getPremium, hasFeature, getEmbedColor };
