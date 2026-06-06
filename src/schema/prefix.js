/** @format */
const { ShimModel } = require("../db/shim");
const { prefix } = require("../db/schema");

module.exports = new ShimModel(prefix);
