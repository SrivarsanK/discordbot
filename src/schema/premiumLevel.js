/** @format */
const { ShimModel } = require("../db/shim");
const { premiumLevel } = require("../db/schema");

module.exports = new ShimModel(premiumLevel);
