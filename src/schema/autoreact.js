const mongoose = require("mongoose");

const autoreactSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  keyword: { type: String, required: true },
  emoji: { type: String, required: true },
});

module.exports = mongoose.model("AutoReact", autoreactSchema);
