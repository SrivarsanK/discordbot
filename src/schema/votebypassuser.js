/** @format */
const { ShimModel } = require("../db/shim");
const { voteBypass } = require("../db/schema");

module.exports = new ShimModel(voteBypass);
