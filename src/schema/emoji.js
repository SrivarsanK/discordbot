/** @format */
const { ShimModel } = require("../db/shim");
const { emoji } = require("../db/schema");

module.exports = new ShimModel(emoji);
