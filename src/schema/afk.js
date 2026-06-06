const mongo = require("mongoose");

const Schema = new mongo.Schema({
  Guild: String,
  Member: String,
  Reason: String,
  Time: String,
});

module.exports = mongo.model("afk", Schema);
