/** @format */
require("./src/config");
const { neon } = require("@neondatabase/serverless");

async function migrate() {
  const sql = neon(process.env.DATABASE_URL);

  console.log("Running LeetCode v4 migration: embed config + CSV columns...");

  await sql`ALTER TABLE leetcode_server_config ADD COLUMN IF NOT EXISTS auto_post_title TEXT`;
  console.log("  Added: auto_post_title");

  await sql`ALTER TABLE leetcode_server_config ADD COLUMN IF NOT EXISTS auto_post_description TEXT`;
  console.log("  Added: auto_post_description");

  await sql`ALTER TABLE leetcode_server_config ADD COLUMN IF NOT EXISTS auto_post_footer TEXT`;
  console.log("  Added: auto_post_footer");

  await sql`ALTER TABLE leetcode_server_config ADD COLUMN IF NOT EXISTS auto_post_color TEXT`;
  console.log("  Added: auto_post_color");

  await sql`ALTER TABLE leetcode_server_config ADD COLUMN IF NOT EXISTS auto_post_thumbnail TEXT`;
  console.log("  Added: auto_post_thumbnail");

  await sql`ALTER TABLE leetcode_server_config ADD COLUMN IF NOT EXISTS auto_post_separator TEXT DEFAULT 'line'`;
  console.log("  Added: auto_post_separator");

  await sql`ALTER TABLE leetcode_server_config ADD COLUMN IF NOT EXISTS auto_post_csv_data JSONB DEFAULT '[]'::jsonb`;
  console.log("  Added: auto_post_csv_data");

  console.log("Migration v4 complete!");
  process.exit(0);
}

migrate().catch(err => {
  console.error("Migration failed:", err);
  process.exit(1);
});
