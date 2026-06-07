/** @format */
const { ShimModel } = require("../db/shim");
const { logging } = require("../db/schema");

module.exports = new ShimModel(logging);
