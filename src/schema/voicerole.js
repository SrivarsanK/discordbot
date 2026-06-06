const mongoose = require("mongoose");

const voiceRoleSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  roleId: { type: String, required: false }, // Role to assign/remove
});

module.exports = mongoose.model("VoiceRole", voiceRoleSchema);
