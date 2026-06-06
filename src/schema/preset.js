const mongoose = require("mongoose");

const presetSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  presetType: { type: Number, required: true }
});

module.exports = mongoose.model("Preset", presetSchema);
