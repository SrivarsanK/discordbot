/** @format */
const { ShimModel } = require("../db/shim");
const { voiceRole } = require("../db/schema");

module.exports = new ShimModel(voiceRole);
