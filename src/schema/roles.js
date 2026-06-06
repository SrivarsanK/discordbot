const mongoose = require("mongoose");

const roleSchema = new mongoose.Schema(
  {
    guildId: { type: String, required: true, unique: true }, // To store the guild ID
    reqrole: { type: String, default: null }, // Role required for all users
    official: { type: String, default: null }, // Official role
    friend: { type: String, default: null }, // Friend role
    guest: { type: String, default: null }, // Guest role
    girl: { type: String, default: null }, // Girl role
    vip: { type: String, default: null }, // VIP role
  },
  { timestamps: true },
);

module.exports = mongoose.model("Roles", roleSchema);
