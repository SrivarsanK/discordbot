/** @format */
const { ShimModel } = require("../db/shim");
const { autoReact } = require("../db/schema");

module.exports = new ShimModel(autoReact);
