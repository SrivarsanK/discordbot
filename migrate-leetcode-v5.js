/** @format */
require("./src/config");
const { neon } = require("@neondatabase/serverless");

async function migrate() {
  const sql = neon(process.env.DATABASE_URL);

  console.log("Running LeetCode v5 migration: show thumbnail toggle...");

  await sql`ALTER TABLE leetcode_server_config ADD COLUMN IF NOT EXISTS auto_post_show_thumbnail BOOLEAN DEFAULT false NOT NULL`;
  console.log("  Added: auto_post_show_thumbnail");

  console.log("Migration v5 complete!");
  process.exit(0);
}

migrate().catch(err => {
  console.error(err);
  process.exit(1);
});
