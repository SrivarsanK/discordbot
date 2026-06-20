/** @format */
const { getDb } = require("./src/db/client");
const { sql } = require("drizzle-orm");

async function migrate() {
  const db = getDb();
  console.log("Starting LeetCode v3 migration (adding auto posting columns)...");

  await db.execute(sql`
    ALTER TABLE leetcode_server_config 
    ADD COLUMN IF NOT EXISTS auto_post_enabled boolean DEFAULT false NOT NULL,
    ADD COLUMN IF NOT EXISTS auto_post_channel_id text;
  `);

  console.log("Migration successfully completed!");
  process.exit(0);
}

migrate().catch(err => {
  console.error("Migration failed:", err.stack || err);
  process.exit(1);
});
