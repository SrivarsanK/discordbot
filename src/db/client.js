/** @format */

const { neon } = require("@neondatabase/serverless");
const { drizzle } = require("drizzle-orm/neon-http");
const schema = require("./schema");
const config = require("../config");

let _db = null;

function getDb() {
  if (_db) return _db;

  const url = config.databaseUrl || process.env.DATABASE_URL;
  if (!url) {
    throw new Error("[DB] DATABASE_URL is not set.");
  }

  const sql = neon(url);
  _db = drizzle(sql, { schema });
  return _db;
}

module.exports = { getDb };
