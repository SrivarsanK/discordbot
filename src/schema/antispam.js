/** @format */
const { ShimModel } = require("../db/shim");
const { antispam } = require("../db/schema");

module.exports = new ShimModel(antispam);
