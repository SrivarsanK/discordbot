/** @format */
const { ShimModel } = require("../db/shim");
const { badge } = require("../db/schema");

module.exports = new ShimModel(badge);
