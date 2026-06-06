const { Schema, model } = require("mongoose");
const mongoose = require("mongoose");
const IgnoreChannelModel = new Schema({
  guildId: String,
  channelId: String,
});

const db = model("ignorechannel", IgnoreChannelModel);
module.exports = db;
