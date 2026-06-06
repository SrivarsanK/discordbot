/** @format */
const { ShimModel } = require("../db/shim");
const { playlists } = require("../db/schema");

module.exports = new ShimModel(playlists);
