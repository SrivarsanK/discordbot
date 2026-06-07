/** @format */
const { getDb } = require("./src/db/client");
const { sql } = require("drizzle-orm");

async function migrate() {
  const db = getDb();
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS logging (
      guild_id text PRIMARY KEY,
      is_enabled boolean DEFAULT false,
      event_channels jsonb DEFAULT '{}'::jsonb,
      ignored_channels jsonb DEFAULT '[]'::jsonb,
      ignored_roles jsonb DEFAULT '[]'::jsonb,
      ignored_users jsonb DEFAULT '[]'::jsonb,
      ignore_embeds boolean DEFAULT false,
      ignore_polls boolean DEFAULT false,
      ignore_sticky boolean DEFAULT false,
      apply_ignore_to_voice boolean DEFAULT false,
      verification_tokens jsonb DEFAULT '[]'::jsonb
    )
  `);
  console.log("Migration done: logging table created in Neon Postgres");
  process.exit(0);
}

migrate().catch(err => {
  console.error("Migration failed:", err.message);
  process.exit(1);
});
