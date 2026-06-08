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
- [ ] **EVT-01**: Implement Message events (`messageDelete`, `messageUpdate`).
- [ ] **EVT-02**: Implement Channel events (`channelCreate`, `channelDelete`, `channelUpdate`).
- [ ] **EVT-03**: Implement Role events (`roleCreate`, `roleDelete`, `roleUpdate`).
- [ ] **EVT-04**: Implement Member events (`guildMemberAdd`, `guildMemberRemove`, `guildMemberUpdate`).
- [ ] **EVT-05**: Implement Voice state events (`voiceStateUpdate`).
- [ ] **EVT-06**: Implement Thread events (`threadCreate`, `threadDelete`, `threadUpdate`, `threadMemberUpdate`).
- [ ] **EVT-07**: Implement Invite & Webhook events (`inviteCreate`, `inviteDelete`, `webhookUpdate`).
- [ ] **EVT-08**: Implement Server update event (`guildUpdate`).

### Dashboard Integration
- [ ] **DASH-01**: Extend `server.js` settings load/save with the new logging attributes and verification endpoint.
- [ ] **DASH-02**: Rebuild the "Logging" module page in `app.js` to show Categories, Event selectors, Thread Verification instructions, and Ignores.

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
| EVT-01 | Phase 3 | Pending |
| EVT-02 | Phase 3 | Pending |
| EVT-03 | Phase 3 | Pending |
| EVT-04 | Phase 3 | Pending |
| EVT-05 | Phase 3 | Pending |
| EVT-06 | Phase 3 | Pending |
| EVT-07 | Phase 3 | Pending |
| EVT-08 | Phase 3 | Pending |
| DASH-01 | Phase 4 | Pending |
| DASH-02 | Phase 4 | Pending |
| CMD-01 | Phase 5 | Pending |

**Coverage:**
- v1 requirements: 15 total
- Mapped to phases: 15
- Unmapped: 0 ✓

---
*Requirements defined: 2026-06-07*
*Last updated: 2026-06-07*
