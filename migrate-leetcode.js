/** @format */
const { getDb } = require("./src/db/client");
const { sql } = require("drizzle-orm");

async function migrate() {
  const db = getDb();
  console.log("Starting LeetCode migration...");

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS leetcode_users (
      discord_id text PRIMARY KEY,
      lc_username text NOT NULL UNIQUE,
      bound_at timestamp DEFAULT now()
    )
  `);
  console.log("Table created: leetcode_users");

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS leetcode_pending (
      discord_id text PRIMARY KEY,
      lc_username text NOT NULL,
      token text NOT NULL,
      expires_at timestamp NOT NULL
    )
  `);
  console.log("Table created: leetcode_pending");

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS leetcode_posted_questions (
      channel_id text NOT NULL,
      slug text NOT NULL,
      title text NOT NULL,
      difficulty text NOT NULL,
      tags jsonb DEFAULT '[]'::jsonb,
      posted_at timestamp DEFAULT now(),
      PRIMARY KEY (channel_id, slug)
    )
  `);
  console.log("Table created: leetcode_posted_questions");

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS leetcode_solves (
      id serial PRIMARY KEY,
      guild_id text NOT NULL,
      discord_id text NOT NULL,
      slug text NOT NULL,
      title text NOT NULL,
      difficulty text NOT NULL,
      points_awarded integer NOT NULL,
      solved_at timestamp NOT NULL,
      recorded_at timestamp DEFAULT now()
    )
  `);
  console.log("Table created: leetcode_solves");

  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS leetcode_solves_uniq ON leetcode_solves (guild_id, discord_id, slug)
  `);
  console.log("Index created: leetcode_solves_uniq");

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS leetcode_server_config (
      guild_id text PRIMARY KEY,
      points_easy integer DEFAULT 10 NOT NULL,
      points_medium integer DEFAULT 20 NOT NULL,
      points_hard integer DEFAULT 30 NOT NULL,
      shoutout_channel_id text
    )
  `);
  console.log("Table created: leetcode_server_config");

  console.log("Migration successfully completed!");
  process.exit(0);
}

migrate().catch(err => {
  console.error("Migration failed:", err.stack || err);
  process.exit(1);
});
