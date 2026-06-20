/** @format */
const { ShimModel } = require("../db/shim");
const { leetcodePostedQuestions } = require("../db/schema");

module.exports = new ShimModel(leetcodePostedQuestions);
