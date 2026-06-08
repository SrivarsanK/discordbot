# Roadmap: Advanced Logging System

## Overview

Implementing a complete Sapphire-style logging system in the Discord bot. We will proceed from database schema setup to logging core utility, event handlers, dashboard settings UI integration, and final chat commands.

## Phases

- [x] **Phase 1: Database Setup & Migration** - Define the logging table, create schema shim, and migrate database.
- [x] **Phase 2: Logging Core Utility & Thread Verification** - Implement the central logSender router and verification logic.
- [x] **Phase 3: Event Listeners** - Hook up all 10 categories of Discord events to the logSender.
- [ ] **Phase 4: Dashboard Integration** - Build backend endpoints and frontend control page for logging.
- [ ] **Phase 5: Discord Chat Command** - Implement `/log` command for setup via chat.

## Phase Details

### Phase 1: Database Setup & Migration
**Goal**: Configure Drizzle table and run SQL migration to create the table.
**Depends on**: Nothing
**Requirements**: DB-01, DB-02, DB-03
**Success Criteria**:
  1. Drizzle schema validates successfully.
  2. Neon database has the new `logging` table.
**Plans**: 1 plan
- [x] 01-01: Setup database schema and run migration

### Phase 2: Logging Core & Thread Verification
**Goal**: Establish central logging engine and token validation.
**Depends on**: Phase 1
**Requirements**: CORE-01, CORE-02
**Success Criteria**:
  1. `logSender.js` checks ignore parameters and routes to correct channel.
  2. Typing `!verify-log <token>` in a thread channel validates and links it.
**Plans**: 1 plan
- [x] 02-01: Implement logSender and thread validation hook

### Phase 3: Event Listeners
**Goal**: Hook up all Discord events to log sender.
**Depends on**: Phase 2
**Requirements**: EVT-01, EVT-02, EVT-03, EVT-04, EVT-05, EVT-06, EVT-07, EVT-08
**Success Criteria**:
  1. Events (deletions, updates, additions) in server trigger log generation.
  2. Deleted/edited messages, roles, channels, members join/leave, voice state changes log correctly.
**Plans**: 1 plan
- [x] 03-01: Add all Discord event listeners

### Phase 4: Dashboard Integration
**Goal**: Setup dashboard API and UI for full customization.
**Depends on**: Phase 3
**Requirements**: DASH-01, DASH-02
**Success Criteria**:
  1. Dashboard API GET/PUT works with logging configurations.
  2. Dashboard UI provides group dropdowns, channel selectors, verification code, and ignore config.
**Plans**: 1 plan
- [ ] 04-01: Update server.js and app.js

### Phase 5: Discord Chat Command
**Goal**: Implement chat command management.
**Depends on**: Phase 4
**Requirements**: CMD-01
**Success Criteria**:
  1. Running `/log set` or `/log ignore` in Discord updates the database.
**Plans**: 1 plan
- [ ] 05-01: Implement `/log` command

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Database Setup | 1/1 | Completed | 2026-06-08 |
| 2. Logging Core | 1/1 | Completed | 2026-06-08 |
| 3. Event Listeners | 1/1 | Completed | 2026-06-08 |
| 4. Dashboard | 0/1 | Not started | - |
| 5. Chat Command | 0/1 | Not started | - |
