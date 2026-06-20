/** @format */
const { ShimModel } = require("../db/shim");
const { leetcodePending } = require("../db/schema");

module.exports = new ShimModel(leetcodePending);
