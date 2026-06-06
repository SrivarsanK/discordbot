const { Schema, model } = require("mongoose");

const NopAccess = new Schema({
  userId: String,
});

module.exports = model("noprefixaccess", NopAccess);
