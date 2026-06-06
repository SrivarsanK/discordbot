/** @format */
const { ShimModel } = require("../db/shim");
const { antinuke } = require("../db/schema");

module.exports = new ShimModel(antinuke);
