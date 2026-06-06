/** @format */
const { ShimModel } = require("../db/shim");
const { vcStatus } = require("../db/schema");

module.exports = new ShimModel(vcStatus);
