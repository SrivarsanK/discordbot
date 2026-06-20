/** @format */
const { ShimModel } = require("../db/shim");
const { leetcodeUsers } = require("../db/schema");

module.exports = new ShimModel(leetcodeUsers);
