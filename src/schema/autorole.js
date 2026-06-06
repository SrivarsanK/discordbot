const mongoose = require("mongoose");

// Define the schema for auto-role configuration
const autoRoleSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true }, // Store the server (guild) ID
  humanRoles: { type: [String], default: [] }, // Store an array of human role IDs
  botRoles: { type: [String], default: [] }, // Store an array of bot role IDs
});

// Create a model for the AutoRole schema
module.exports = mongoose.model("AutoRole", autoRoleSchema);
