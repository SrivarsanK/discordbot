// schema/profile.js
const mongoose = require("mongoose");

const profileSchema = new mongoose.Schema({
  User: { type: String, required: true, unique: true },
  Bio: { type: String, default: "" },
  SocialMedia: {
    twitter: {
      link: { type: String, default: "" },
      username: { type: String, default: "" },
    },
    instagram: {
      link: { type: String, default: "" },
      username: { type: String, default: "" },
    },
    discord: {
      link: { type: String, default: "" },
      username: { type: String, default: "" },
    },
  },
});

module.exports = mongoose.model("Profile", profileSchema);
