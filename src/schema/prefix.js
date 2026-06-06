const { Schema, model } = require("mongoose");

const Prefix = new Schema({
  Guild: String,
  Prefix: String,
  oldPrefix: String,
});

module.exports = model("prefix", Prefix);
