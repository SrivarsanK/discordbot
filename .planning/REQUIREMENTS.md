# Requirements: Advanced Logging System

**Defined:** 2026-06-07
**Core Value:** Keep Discord servers secure, organized, and engaging with minimal configuration overhead.

## v1 Requirements

Requirements for the advanced logging system.

### Database Setup
- [x] **DB-01**: Define `logging` Drizzle table with configurations for enabled state, channel mappings, ignores (channels, roles, users, embeds, polls, sticky), and thread verification tokens.
- [x] **DB-02**: Create database shim `src/schema/logging.js` using `ShimModel`.
- [x] **DB-03**: Create and execute Neon database migration script `migrate-logging-system.js`.

### Logging Core & Event Routing
- [x] **CORE-01**: Implement `src/utils/logSender.js` for checking ignores, building embeds, and posting to normal/thread channels.
- [x] **CORE-02**: Intercept `!verify-log <token>` command in `messageCreate.js` to verify thread/forum channels and assign them.

### Event Listeners
- [x] **EVT-01**: Implement Message events (`messageDelete`, `messageUpdate`).
- [x] **EVT-02**: Implement Channel events (`channelCreate`, `channelDelete`, `channelUpdate`).
- [x] **EVT-03**: Implement Role events (`roleCreate`, `roleDelete`, `roleUpdate`).
- [x] **EVT-04**: Implement Member events (`guildMemberAdd`, `guildMemberRemove`, `guildMemberUpdate`).
- [x] **EVT-05**: Implement Voice state events (`voiceStateUpdate`).
- [x] **EVT-06**: Implement Thread events (`threadCreate`, `threadDelete`, `threadUpdate`, `threadMemberUpdate`).
- [x] **EVT-07**: Implement Invite & Webhook events (`inviteCreate`, `inviteDelete`, `webhookUpdate`).
- [x] **EVT-08**: Implement Server update event (`guildUpdate`).

### Dashboard Integration
- [x] **DASH-01**: Extend `server.js` settings load/save with the new logging attributes and verification endpoint.
- [x] **DASH-02**: Rebuild the "Logging" module page in `app.js` to show Categories, Event selectors, Thread Verification instructions, and Ignores.

### Discord Commands
- [ ] **CMD-01**: Implement `/log` command with subcommands: `set <channel> <types>`, `remove <types>`, `ignore <channel|role|user>`, and `view`.

## v2 Requirements
- **PRE-01**: Implement custom embed style configurations (colors, custom headers) per log event from the dashboard.

## Out of Scope
- Custom log message parsing engine (e.g. allowing users to change log text placeholders like `{user} deleted message in {channel}`). Only standard bot embeds are generated.

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| DB-01 | Phase 1 | Completed |
| DB-02 | Phase 1 | Completed |
| DB-03 | Phase 1 | Completed |
| CORE-01 | Phase 2 | Completed |
| CORE-02 | Phase 2 | Completed |
| EVT-01 | Phase 3 | Completed |
| EVT-02 | Phase 3 | Completed |
| EVT-03 | Phase 3 | Completed |
| EVT-04 | Phase 3 | Completed |
| EVT-05 | Phase 3 | Completed |
| EVT-06 | Phase 3 | Completed |
| EVT-07 | Phase 3 | Completed |
| EVT-08 | Phase 3 | Completed |
| DASH-01 | Phase 4 | Completed |
| DASH-02 | Phase 4 | Completed |
| CMD-01 | Phase 5 | Pending |

**Coverage:**
- v1 requirements: 15 total
- Mapped to phases: 15
- Unmapped: 0 ✓

---
*Requirements defined: 2026-06-07*
*Last updated: 2026-06-07*
