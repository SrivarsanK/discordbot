const mongoose = require("mongoose");

const AntiLinkSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  isEnabled: { type: Boolean, default: false },
  whitelistUsers: { type: [String], default: [] },
  whitelistRoles: { type: [String], default: [] },
});

module.exports = mongoose.model("AntiLink", AntiLinkSchema);
