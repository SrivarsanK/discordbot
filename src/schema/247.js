/** @format */
const { ShimModel } = require("../db/shim");
const { alwaysOn } = require("../db/schema");

module.exports = new ShimModel(alwaysOn);
