/** @format */
const { ShimModel } = require("../db/shim");
const { premiumSettings } = require("../db/schema");

module.exports = new ShimModel(premiumSettings);
