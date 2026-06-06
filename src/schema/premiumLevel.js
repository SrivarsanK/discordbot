const mongoose = require("mongoose");

const PremiumLevelSchema = new mongoose.Schema(
  {
    guildId: { type: String, required: true },
    userId: { type: String, required: true },
    chatXp: { type: Number, default: 0 },
    voiceXp: { type: Number, default: 0 },
    totalXp: { type: Number, default: 0 },
    level: { type: Number, default: 0 },
    lastMessageAt: { type: Date, default: null },
  },
  { timestamps: true },
);

PremiumLevelSchema.index({ guildId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model("PremiumLevel", PremiumLevelSchema);
