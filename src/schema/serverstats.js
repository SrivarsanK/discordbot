/** @format */
const { ShimModel } = require("../db/shim");
const { serverStats } = require("../db/schema");

module.exports = new ShimModel(serverStats);
