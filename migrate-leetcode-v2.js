/** @format */
const { getDb } = require("./src/db/client");
const { sql } = require("drizzle-orm");

async function migrate() {
  const db = getDb();
  console.log("Starting LeetCode v2 migration (adding solved stats columns)...");

  await db.execute(sql`
    ALTER TABLE leetcode_users 
    ADD COLUMN IF NOT EXISTS solved_easy integer DEFAULT 0 NOT NULL,
    ADD COLUMN IF NOT EXISTS solved_medium integer DEFAULT 0 NOT NULL,
    ADD COLUMN IF NOT EXISTS solved_hard integer DEFAULT 0 NOT NULL,
    ADD COLUMN IF NOT EXISTS last_updated timestamp;
  `);

  console.log("Migration successfully completed!");
  process.exit(0);
}

migrate().catch(err => {
  console.error("Migration failed:", err.stack || err);
  process.exit(1);
});
