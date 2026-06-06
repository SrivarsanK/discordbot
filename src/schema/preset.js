/** @format */
const { ShimModel } = require("../db/shim");
const { preset } = require("../db/schema");

module.exports = new ShimModel(preset);
