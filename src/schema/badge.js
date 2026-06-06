const mongoose = require("mongoose");
const Badge = mongoose.Schema({
  userId: String,
  blacklisted: { type: Boolean, default: false },
  count: { type: Number, default: 0 },
  badge: {
    owner: { type: Boolean, default: false },
    creator: { type: Boolean, default: false },
    web: { type: Boolean, default: false },
    dev: { type: Boolean, default: false },
    admin: { type: Boolean, default: false },
    staff: { type: Boolean, default: false },
    supporter: { type: Boolean, default: false },
    sponsor: { type: Boolean, default: false },
    ownerspecial: { type: Boolean, default: false },
    specialone: { type: Boolean, default: false },
    bug: { type: Boolean, default: false },
    noprefix: { type: Boolean, default: false },
    vip: { type: Boolean, default: false },
    friend: { type: Boolean, default: false },
    partner: { type: Boolean, default: false },
    loveone: { type: Boolean, default: false },
  },
});

module.exports = mongoose.model("user", Badge);
