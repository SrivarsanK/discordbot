const mongoose = require("mongoose");

const PremiumSchema = new mongoose.Schema({
  // Can be a guildId or userId
  id: { type: String, required: true, unique: true },
  type: { type: String, enum: ["guild", "user"], required: true },

  // Tier: "basic" | "pro" | "elite"
  tier: { type: String, enum: ["basic", "pro", "elite"], default: "basic" },

  // Who added it and when
  addedBy: { type: String },
  addedAt: { type: Date, default: Date.now },

  // Expiry — null = lifetime
  expiresAt: { type: Date, default: null },

  // Feature toggles
  features: {
    customPrefix:    { type: Boolean, default: false },
    unlimitedQueue:  { type: Boolean, default: false },
    priorityPlay:    { type: Boolean, default: false },
    customEmbed:     { type: Boolean, default: false },
    advancedFilters: { type: Boolean, default: false },
    noAds:           { type: Boolean, default: true  },
    leveling:        { type: Boolean, default: false },
    branding:        { type: Boolean, default: false },
    vcGuard:         { type: Boolean, default: false },
    stickyMessages:  { type: Boolean, default: false },
    dashboard:       { type: Boolean, default: false },
  },

  // Custom embed color for premium users/guilds
  embedColor: { type: String, default: null },

  // Custom bot nickname in the guild
  customTag:  { type: String, default: null },

  // Notes
  note: { type: String, default: "" },

  // Payment/subscription metadata. Actual checkout provider webhooks can keep
  // these fields in sync while the bot keeps one entitlement shape.
  status: {
    type: String,
    enum: ["active", "trialing", "past_due", "canceled", "manual"],
    default: "manual",
  },
  payment: {
    provider: { type: String, default: "" },
    customerId: { type: String, default: "" },
    subscriptionId: { type: String, default: "" },
    priceId: { type: String, default: "" },
    currentPeriodEnd: { type: Date, default: null },
    checkoutUrl: { type: String, default: "" },
  },
});

// Helper — check if premium is still valid
PremiumSchema.methods.isActive = function () {
  if (["canceled"].includes(this.status)) return false;
  if (!this.expiresAt) return true;
  return new Date() < this.expiresAt;
};

module.exports = mongoose.model("Premium", PremiumSchema);
