/** @format */
const { ShimModel } = require("../db/shim");
const { accessNop } = require("../db/schema");

module.exports = new ShimModel(accessNop);
