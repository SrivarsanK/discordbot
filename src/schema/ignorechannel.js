/** @format */
const { ShimModel } = require("../db/shim");
const { ignoreChannel } = require("../db/schema");

module.exports = new ShimModel(ignoreChannel);
