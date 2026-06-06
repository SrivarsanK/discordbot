const mongoose = require("mongoose");

const AntiNukeSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },
  isEnabled: { type: Boolean, default: false },
  extraOwners: { type: [String], default: [] },
  whitelistUsers: { type: [String], default: [] },
  whitelistRoles: { type: [String], default: [] },
  logChannelId: { type: String, default: null }, // Add this field for logging channel
});

module.exports = mongoose.model("AntiNuke", AntiNukeSchema);
