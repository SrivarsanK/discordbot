/** @format */

const {
  pgTable,
  text,
  boolean,
  integer,
  real,
  timestamp,
  jsonb,
  primaryKey,
  serial,
} = require("drizzle-orm/pg-core");

// ── antinuke ──────────────────────────────────────────────────────────────────
const antinuke = pgTable("antinuke", {
  guildId:        text("guild_id").primaryKey(),
  isEnabled:      boolean("is_enabled").default(false),
  extraOwners:    jsonb("extra_owners").default([]),
  whitelistUsers: jsonb("whitelist_users").default([]),
  whitelistRoles: jsonb("whitelist_roles").default([]),
  logChannelId:   text("log_channel_id"),
});

// ── antilink ──────────────────────────────────────────────────────────────────
const antilink = pgTable("antilink", {
  guildId:   text("guild_id").primaryKey(),
  enabled:   boolean("enabled").default(false),
  mode:      text("mode").default("delete"),
  whitelist: jsonb("whitelist").default([]),
});

// ── antispam ──────────────────────────────────────────────────────────────────
const antispam = pgTable("antispam", {
  guildId:   text("guild_id").primaryKey(),
  enabled:   boolean("enabled").default(false),
  threshold: integer("threshold").default(5),
  action:    text("action").default("mute"),
  whitelist: jsonb("whitelist").default([]),
});

// ── auto_responses (ar) ───────────────────────────────────────────────────────
const autoResponses = pgTable("auto_responses", {
  guildId:   text("guild_id").primaryKey(),
  responses: jsonb("responses").default([]),
});

// ── auto_react ────────────────────────────────────────────────────────────────
const autoReact = pgTable("auto_react", {
  guildId:  text("guild_id").primaryKey(),
  triggers: jsonb("triggers").default([]),
});

// ── auto_role ─────────────────────────────────────────────────────────────────
const autoRole = pgTable("auto_role", {
  guildId: text("guild_id").primaryKey(),
  roles:   jsonb("roles").default([]),
});

// ── afk ───────────────────────────────────────────────────────────────────────
const afk = pgTable("afk", {
  userId:    text("user_id").primaryKey(),
  guildId:   text("guild_id"),
  reason:    text("reason").default(""),
  timestamp: timestamp("timestamp").defaultNow(),
});

// ── blacklist ─────────────────────────────────────────────────────────────────
const blacklist = pgTable("blacklist", {
  userId:  text("user_id").primaryKey(),
  reason:  text("reason").default(""),
  addedAt: timestamp("added_at").defaultNow(),
});

// ── badge ─────────────────────────────────────────────────────────────────────
const badge = pgTable("badge", {
  userId: text("user_id").primaryKey(),
  badges: jsonb("badges").default([]),
});

// ── profile ───────────────────────────────────────────────────────────────────
const profile = pgTable("profile", {
  userId:      text("user_id").primaryKey(),
  bio:         text("bio").default(""),
  socialMedia: jsonb("social_media").default({}),
});

// ── prefix ────────────────────────────────────────────────────────────────────
const prefix = pgTable("prefix", {
  guildId: text("guild_id").primaryKey(),
  prefix:  text("prefix").notNull(),
  oldPrefix: text("old_prefix"),
});

// ── noprefix ──────────────────────────────────────────────────────────────────
const noprefix = pgTable("noprefix", {
  userId:  text("user_id").primaryKey(),
  guildId: text("guild_id"),
});

// ── access_nop ────────────────────────────────────────────────────────────────
const accessNop = pgTable("access_nop", {
  guildId: text("guild_id").primaryKey(),
  users:   jsonb("users").default([]),
});

// ── ignore_channel ────────────────────────────────────────────────────────────
const ignoreChannel = pgTable("ignore_channel", {
  guildId:  text("guild_id").primaryKey(),
  channels: jsonb("channels").default([]),
});

// ── preset ────────────────────────────────────────────────────────────────────
const preset = pgTable("preset", {
  guildId:  text("guild_id").primaryKey(),
  settings: jsonb("settings").default({}),
});

// ── roles ─────────────────────────────────────────────────────────────────────
const roles = pgTable("roles", {
  guildId: text("guild_id").primaryKey(),
  roles:   jsonb("roles").default({}),
});

// ── setup ─────────────────────────────────────────────────────────────────────
const setup = pgTable("setup", {
  guildId:   text("guild_id").primaryKey(),
  channelId: text("channel_id"),
  roleId:    text("role_id"),
});

// ── vc_status ─────────────────────────────────────────────────────────────────
const vcStatus = pgTable("vc_status", {
  guildId: text("guild_id").primaryKey(),
  enabled: boolean("enabled").default(false),
  format:  text("format").default(""),
});

// ── voice_role ────────────────────────────────────────────────────────────────
const voiceRole = pgTable("voice_role", {
  guildId:  text("guild_id").primaryKey(),
  mappings: jsonb("mappings").default([]),
});

// ── vote_bypass ───────────────────────────────────────────────────────────────
const voteBypass = pgTable("vote_bypass", {
  userId:    text("user_id").primaryKey(),
  expiresAt: timestamp("expires_at"),
});

// ── always_on (247) ───────────────────────────────────────────────────────────
const alwaysOn = pgTable("always_on", {
  guildId:   text("guild_id").primaryKey(),
  channelId: text("channel_id"),
  enabled:   boolean("enabled").default(false),
});

// ── emoji ─────────────────────────────────────────────────────────────────────
const emoji = pgTable("emoji", {
  guildId: text("guild_id").primaryKey(),
  data:    jsonb("data").default({}),
});

// ── playlists ─────────────────────────────────────────────────────────────────
const playlists = pgTable("playlists", {
  id:           serial("id").primaryKey(),
  userId:       text("user_id").notNull(),
  username:     text("username"),
  playlistName: text("playlist_name").notNull(),
  tracks:       jsonb("tracks").default([]),
  createdOn:    integer("created_on").notNull(),
});

// ── premium_level ─────────────────────────────────────────────────────────────
const premiumLevel = pgTable(
  "premium_level",
  {
    guildId:       text("guild_id").notNull(),
    userId:        text("user_id").notNull(),
    chatXp:        integer("chat_xp").default(0),
    voiceXp:       integer("voice_xp").default(0),
    totalXp:       integer("total_xp").default(0),
    level:         integer("level").default(0),
    lastMessageAt: timestamp("last_message_at"),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.guildId, t.userId] }),
  }),
);

// ── premium ───────────────────────────────────────────────────────────────────
const premium = pgTable("premium", {
  id:         text("id").primaryKey(),
  type:       text("type").notNull(),  // "guild" | "user"
  tier:       text("tier").default("basic"),
  addedBy:    text("added_by"),
  addedAt:    timestamp("added_at").defaultNow(),
  expiresAt:  timestamp("expires_at"),
  features:   jsonb("features").default({}),
  embedColor: text("embed_color"),
  customTag:  text("custom_tag"),
  note:       text("note").default(""),
  status:     text("status").default("manual"),
  payment:    jsonb("payment").default({}),
});

// ── premium_settings ──────────────────────────────────────────────────────────
const premiumSettings = pgTable("premium_settings", {
  guildId:   text("guild_id").primaryKey(),
  branding:  jsonb("branding").default({}),
  leveling:  jsonb("leveling").default({}),
  vcGuard:   jsonb("vc_guard").default({}),
  sticky:    jsonb("sticky").default({}),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ── welcome_system ────────────────────────────────────────────────────────────
const welcomeSystem = pgTable("welcome_system", {
  guildId: text("guild_id").primaryKey(),
  data:    jsonb("data").default({}),
  welcome: jsonb("welcome").default({}),
});

module.exports = {
  afk,
  alwaysOn,
  accessNop,
  antilink,
  antinuke,
  antispam,
  autoReact,
  autoResponses,
  autoRole,
  badge,
  blacklist,
  emoji,
  ignoreChannel,
  noprefix,
  playlists,
  prefix,
  premium,
  premiumLevel,
  premiumSettings,
  preset,
  profile,
  roles,
  setup,
  vcStatus,
  voiceRole,
  voteBypass,
  welcomeSystem,
};
