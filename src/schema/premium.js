/** @format */
const { ShimModel } = require("../db/shim");
const { premium } = require("../db/schema");

const customDocMethods = {
  isActive() {
    if (["canceled"].includes(this.status)) return false;
    if (!this.expiresAt) return true;
    return new Date() < new Date(this.expiresAt);
  }
};

module.exports = new ShimModel(premium, customDocMethods);
