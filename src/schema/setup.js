/** @format */
const { ShimModel } = require("../db/shim");
const { setup } = require("../db/schema");

module.exports = new ShimModel(setup);
