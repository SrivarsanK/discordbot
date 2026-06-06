const { Schema, model } = require("mongoose");

const VoteBypassUserSchema = new Schema({
  userId: {
    type: String,
    unique: true,
    required: true,
  },
  expiresAt: {
    type: Date, // Optional field for expiration
    default: null, // Null indicates no expiration
  },
});

module.exports = model("VoteBypassUser", VoteBypassUserSchema);
