/** @format */
const { ShimModel } = require("../db/shim");
const { profile } = require("../db/schema");

module.exports = new ShimModel(profile);
