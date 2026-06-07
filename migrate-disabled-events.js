/** @format */
const { getDb } = require("./src/db/client");
const { sql } = require("drizzle-orm");

async function migrate() {
  const db = getDb();
  await db.execute(sql`
    ALTER TABLE antinuke
    ADD COLUMN IF NOT EXISTS disabled_events jsonb DEFAULT '[]'::jsonb
  `);
  console.log("Migration done: disabled_events column added to antinuke");
  process.exit(0);
}

migrate().catch(err => {
  console.error("Migration failed:", err.message);
  process.exit(1);
});
