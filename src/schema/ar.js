const { Schema, model } = require("mongoose");

const Autoresponder = new Schema({
  guildId: String,
  autoresponses: [
    {
      trigger: String,
      response: String,
    },
  ],
});
module.exports = model("Autoresponser", Autoresponder);
