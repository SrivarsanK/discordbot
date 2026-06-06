/** @format */
const { ShimModel } = require("../db/shim");
const { autoResponses } = require("../db/schema");

module.exports = new ShimModel(autoResponses);
