# DSC SRM RMP Discord Bot

## What This Is

A feature-rich Discord bot designed for server moderation, security (AntiNuke, AutoMod), entertainment (Music, Leveling), and utility (Welcome messages, AFK system). It is managed through a web-based dashboard allowing server administrators to control features dynamically.

## Core Value

Keep Discord servers secure, organized, and engaging with minimal configuration overhead.

## Requirements

### Validated

- ✓ Prefix and Slash Commands framework
- ✓ AntiNuke security subsystem (AntiBan, AntiKick, etc.)
- ✓ AutoModeration system (AntiLink, AntiSpam)
- ✓ Welcome System with custom messages and dynamic images
- ✓ Music playback system with 24/7 support
- ✓ Multi-role configuration and VC Role mapping
- ✓ Admin Dashboard at http://localhost:3000

### Active

- [ ] Implement Advanced Logging System (Sapphire-style)
  - [ ] Group logging events into logical categories (Messages, Channels, Roles, Members, Voice, Threads, Invites, Webhooks, Server)
  - [ ] Support custom log channels for each event type or category
  - [ ] Add ignore rules (channels, roles, users, embed messages, polls, sticky messages)
  - [ ] Integrate thread/forum channel verification with unique tokens
  - [ ] Rebuild Dashboard "Logging" page to support category selection, category-wide channel set, per-event channel set, thread setup, and ignore configurations
  - [ ] Prefix/Slash command `/log` to manage settings in chat

### Out of Scope

- [ ] Custom embed designing/styling per log event (Only general templates; custom log message layout/content is deferred to keep implementation scope focused)

## Context

- Technical environment: Node.js (v20+), Discord.js v14, Drizzle ORM over Neon Serverless Postgres, and a custom dashboard using a vanilla JS frontend.
- Database access uses a Compatibility Shim (`src/db/shim.js`) providing a Mongoose-like API on top of Drizzle schemas.

## Constraints

- **Compatibility**: Must use the Mongoose-like database shim where possible or raw Drizzle queries.
- **Intents**: Events depend on `INTENTS` in `.env` being enabled (currently `Guilds`, `GuildMembers`, `GuildModeration`, `GuildEmojisAndStickers`, `GuildWebhooks`, `GuildInvites`, `GuildVoiceStates`, `GuildMessages`, `MessageContent`, `AutoModerationConfiguration`, `AutoModerationExecution`).

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Create a separate `logging` table | Keeps logging settings separate from the core `antinuke` config to avoid table bloating and keep responsibilities clean. | — Pending |

---

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-06-07 after initialization*
