/** @format */
const { ShimModel } = require("../db/shim");
const { blacklist } = require("../db/schema");

module.exports = new ShimModel(blacklist);