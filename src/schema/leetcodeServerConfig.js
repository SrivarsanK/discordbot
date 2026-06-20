/** @format */
const { ShimModel } = require("../db/shim");
const { leetcodeServerConfig } = require("../db/schema");

module.exports = new ShimModel(leetcodeServerConfig);
