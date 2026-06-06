/** @format */
const { ShimModel } = require("../db/shim");
const { antilink } = require("../db/schema");

module.exports = new ShimModel(antilink);
