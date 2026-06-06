const mongoose = require(`mongoose`);
const noprefix = new mongoose.Schema({
  noprefix: Boolean,
  userId: String,
  guildId: String,
  expiresAt: {
    type: Date, // Optional field for expiration
    default: null, // Null indicates no expiration
  },
});
module.exports = mongoose.model("Noprefix", noprefix);
