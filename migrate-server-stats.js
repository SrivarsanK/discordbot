/** @format */
const { getDb } = require("./src/db/client");
const { sql } = require("drizzle-orm");

async function migrate() {
  const db = getDb();
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS server_stats (
      guild_id text PRIMARY KEY,
      is_enabled boolean DEFAULT true,
      category_channel_id text,
      channels jsonb DEFAULT '[]'::jsonb,
      last_updated timestamp
    )
  `);
  console.log("Migration done: server_stats table created in Neon Postgres");
  process.exit(0);
}

migrate().catch(err => {
  console.error("Migration failed:", err.message);
  process.exit(1);
});
