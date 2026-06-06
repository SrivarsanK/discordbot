CREATE TABLE "afk" (
	"user_id" text PRIMARY KEY NOT NULL,
	"guild_id" text,
	"reason" text DEFAULT '',
	"timestamp" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "always_on" (
	"guild_id" text PRIMARY KEY NOT NULL,
	"channel_id" text,
	"enabled" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "access_nop" (
	"guild_id" text PRIMARY KEY NOT NULL,
	"users" jsonb DEFAULT '[]'::jsonb
);
--> statement-breakpoint
CREATE TABLE "antilink" (
	"guild_id" text PRIMARY KEY NOT NULL,
	"enabled" boolean DEFAULT false,
	"mode" text DEFAULT 'delete',
	"whitelist" jsonb DEFAULT '[]'::jsonb
);
--> statement-breakpoint
CREATE TABLE "antinuke" (
	"guild_id" text PRIMARY KEY NOT NULL,
	"is_enabled" boolean DEFAULT false,
	"extra_owners" jsonb DEFAULT '[]'::jsonb,
	"whitelist_users" jsonb DEFAULT '[]'::jsonb,
	"whitelist_roles" jsonb DEFAULT '[]'::jsonb,
	"log_channel_id" text
);
--> statement-breakpoint
CREATE TABLE "antispam" (
	"guild_id" text PRIMARY KEY NOT NULL,
	"enabled" boolean DEFAULT false,
	"threshold" integer DEFAULT 5,
	"action" text DEFAULT 'mute',
	"whitelist" jsonb DEFAULT '[]'::jsonb
);
--> statement-breakpoint
CREATE TABLE "auto_react" (
	"guild_id" text PRIMARY KEY NOT NULL,
	"triggers" jsonb DEFAULT '[]'::jsonb
);
--> statement-breakpoint
CREATE TABLE "auto_responses" (
	"guild_id" text PRIMARY KEY NOT NULL,
	"responses" jsonb DEFAULT '[]'::jsonb
);
--> statement-breakpoint
CREATE TABLE "auto_role" (
	"guild_id" text PRIMARY KEY NOT NULL,
	"roles" jsonb DEFAULT '[]'::jsonb
);
--> statement-breakpoint
CREATE TABLE "badge" (
	"user_id" text PRIMARY KEY NOT NULL,
	"badges" jsonb DEFAULT '[]'::jsonb
);
--> statement-breakpoint
CREATE TABLE "blacklist" (
	"user_id" text PRIMARY KEY NOT NULL,
	"reason" text DEFAULT '',
	"added_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "emoji" (
	"guild_id" text PRIMARY KEY NOT NULL,
	"data" jsonb DEFAULT '{}'::jsonb
);
--> statement-breakpoint
CREATE TABLE "ignore_channel" (
	"guild_id" text PRIMARY KEY NOT NULL,
	"channels" jsonb DEFAULT '[]'::jsonb
);
--> statement-breakpoint
CREATE TABLE "noprefix" (
	"user_id" text PRIMARY KEY NOT NULL,
	"guild_id" text
);
--> statement-breakpoint
CREATE TABLE "playlists" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"username" text,
	"playlist_name" text NOT NULL,
	"tracks" jsonb DEFAULT '[]'::jsonb,
	"created_on" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prefix" (
	"guild_id" text PRIMARY KEY NOT NULL,
	"prefix" text NOT NULL,
	"old_prefix" text
);
--> statement-breakpoint
CREATE TABLE "premium" (
	"id" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"tier" text DEFAULT 'basic',
	"added_by" text,
	"added_at" timestamp DEFAULT now(),
	"expires_at" timestamp,
	"features" jsonb DEFAULT '{}'::jsonb,
	"embed_color" text,
	"custom_tag" text,
	"note" text DEFAULT '',
	"status" text DEFAULT 'manual',
	"payment" jsonb DEFAULT '{}'::jsonb
);
--> statement-breakpoint
CREATE TABLE "premium_level" (
	"guild_id" text NOT NULL,
	"user_id" text NOT NULL,
	"chat_xp" integer DEFAULT 0,
	"voice_xp" integer DEFAULT 0,
	"total_xp" integer DEFAULT 0,
	"level" integer DEFAULT 0,
	"last_message_at" timestamp,
	CONSTRAINT "premium_level_guild_id_user_id_pk" PRIMARY KEY("guild_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "premium_settings" (
	"guild_id" text PRIMARY KEY NOT NULL,
	"branding" jsonb DEFAULT '{}'::jsonb,
	"leveling" jsonb DEFAULT '{}'::jsonb,
	"vc_guard" jsonb DEFAULT '{}'::jsonb,
	"sticky" jsonb DEFAULT '{}'::jsonb,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "preset" (
	"guild_id" text PRIMARY KEY NOT NULL,
	"settings" jsonb DEFAULT '{}'::jsonb
);
--> statement-breakpoint
CREATE TABLE "profile" (
	"user_id" text PRIMARY KEY NOT NULL,
	"bio" text DEFAULT '',
	"social_media" jsonb DEFAULT '{}'::jsonb
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"guild_id" text PRIMARY KEY NOT NULL,
	"roles" jsonb DEFAULT '{}'::jsonb
);
--> statement-breakpoint
CREATE TABLE "setup" (
	"guild_id" text PRIMARY KEY NOT NULL,
	"channel_id" text,
	"role_id" text
);
--> statement-breakpoint
CREATE TABLE "vc_status" (
	"guild_id" text PRIMARY KEY NOT NULL,
	"enabled" boolean DEFAULT false,
	"format" text DEFAULT ''
);
--> statement-breakpoint
CREATE TABLE "voice_role" (
	"guild_id" text PRIMARY KEY NOT NULL,
	"mappings" jsonb DEFAULT '[]'::jsonb
);
--> statement-breakpoint
CREATE TABLE "vote_bypass" (
	"user_id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "welcome_system" (
	"guild_id" text PRIMARY KEY NOT NULL,
	"data" jsonb DEFAULT '{}'::jsonb,
	"welcome" jsonb DEFAULT '{}'::jsonb
);
