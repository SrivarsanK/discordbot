/** @format */
const { ShimModel } = require("../db/shim");
const { noprefix } = require("../db/schema");

module.exports = new ShimModel(noprefix);
