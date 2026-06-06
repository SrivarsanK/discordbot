/** @format */
const { ShimModel } = require("../db/shim");
const { afk } = require("../db/schema");

module.exports = new ShimModel(afk);
