const mongoose = require("mongoose");

const antiSpamSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },
  isEnabled: { type: Boolean, default: false },
  messageThreshold: { type: Number, default: 5 }, // Messages in a given timeframe
  timeframe: { type: Number, default: 10 }, // Timeframe in seconds
  whitelistUsers: { type: [String], default: [] },
  whitelistRoles: { type: [String], default: [] },
});

module.exports = mongoose.model("AntiSpam", antiSpamSchema);
