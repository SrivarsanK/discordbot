/** @format */
require("./src/config");
const { neon } = require("@neondatabase/serverless");

async function migrate() {
  const sql = neon(process.env.DATABASE_URL);

  console.log("Running LeetCode v6 migration: rotation day counter column...");

  await sql`ALTER TABLE leetcode_server_config ADD COLUMN IF NOT EXISTS auto_post_csv_day INTEGER DEFAULT 1 NOT NULL`;
  console.log("  Added: auto_post_csv_day");

  console.log("Migration v6 complete!");
  process.exit(0);
}

migrate().catch(err => {
  console.error(err);
  process.exit(1);
});
