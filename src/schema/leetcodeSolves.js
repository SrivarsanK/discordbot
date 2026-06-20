/** @format */
const { ShimModel } = require("../db/shim");
const { leetcodeSolves } = require("../db/schema");

module.exports = new ShimModel(leetcodeSolves);
