/** @format */
const { ShimModel } = require("../db/shim");
const { roles } = require("../db/schema");

module.exports = new ShimModel(roles);
