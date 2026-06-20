/** @format */
require("./src/config");
const { neon } = require("@neondatabase/serverless");

async function migrate() {
  const sql = neon(process.env.DATABASE_URL);

  console.log("Running LeetCode v7 migration: add nonce column to posted questions...");

  await sql`ALTER TABLE leetcode_posted_questions ADD COLUMN IF NOT EXISTS nonce TEXT`;
  console.log("  Added: nonce");

  console.log("Migration v7 complete!");
  process.exit(0);
}

migrate().catch(err => {
  console.error("Migration failed:", err);
  process.exit(1);
});
