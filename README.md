# DSC SRM RMP Discord Bot

A feature-rich, all-in-one Discord bot with music, moderation, anti-nuke, automation, and much more! Built with discord.js v14, Neon Postgres (Drizzle ORM) for data persistence, and hybrid sharding for scalability.

## Description
DSC SRM RMP is a complete Discord bot solution that offers:
- Advanced music system with Kazagumo & Shoukaku
- Comprehensive anti-nuke protection
- Powerful moderation tools
- Advanced logging system with thread/forum verification
- Automation features (auto-responder, auto-react, auto-role, welcome messages, leveling, etc.)
- Built-in web dashboard for easy management
- Emoji Manager for managing Discord application emojis

## Features

### 🎵 Music System
- Powered by Kazagumo & Shoukaku
- Supports YouTube, Spotify, SoundCloud, and more via Lavalink
- Playlists, audio filters (8D, bassboost, nightcore, etc.), lyrics, and voice commands
- 24/7 mode, autoplay, loop, shuffle, seek, and more
- Both prefix commands and slash commands available

### 🛡️ Anti-Nuke & Security
- Comprehensive anti-nuke protection
- Detects and blocks mass bans, kicks, role deletes, channel deletes, etc.
- Whitelist system for trusted users
- Anti-bot add protection
- Anti-everyone/here mention protection
- Webhook, emoji, and sticker change protection

### 🔧 Moderation
- Ban, kick, mute, unban, unbanall commands
- Purge messages and bots
- Hide/unhide channels
- Lock/unlock channels
- Role management and role menus
- Steal emojis and stickers
- Server info and user info commands

### 📝 Advanced Logging System
- Per-event logging configuration with distinct, visual channel type indicators (Text, Announcement, Forum, Thread, Voice, Stage).
- Support for normal text channels, threads, or forum parent channel destinations (automatically creates separate log threads).
- Interactive thread/forum validation token system (`!verify-log <token>`) to securely hook channels from Discord.
- Event ignore lists for channels, roles, and users.
- Custom filters for ignoring embeds, poll deletions, and sticky messages.
- Dedicated categories including:
  - **Messages** (Edit, Delete)
  - **Channels** (Create, Delete, Update)
  - **Roles** (Create, Delete, Update)
  - **Members** (Join, Leave, Profile Updates)
  - **Voice** (Join, Leave, Move)
  - **Threads** (Create, Delete, Update, Member Join)
  - **Invites & Webhooks** (Create, Delete, Webhook updates)
  - **Server** (Server profile updates)
  - **Moderation** (Ban, Unban, Kick, Timeout, Message Purges)

### ⚙️ Automation
- Auto-responder: Custom message triggers and replies
- Auto-react: Automatic reactions to messages
- Auto-role: Assign human/bot roles on member join (failsafe with API backup)
- Voice roles: Assign roles based on voice channel activity
- Welcome system: Custom welcome messages and banners
- AFK system
- Leveling system: Chat and voice XP with level-up messages
- VC Guard: Protect selected voice channels with bypass roles
- Sticky messages: Keep important messages pinned to the bottom of channels

### 📊 Dashboard
- Built-in web dashboard for easy bot management
- Discord OAuth2 login
- Server management
- Settings configuration (Welcome, Automod, Logging, Leveling, VC Guard, Sticky, Roles)
- Default local URL: http://localhost:3000

### 😊 Emoji Manager
- Standalone emoji management server
- Sync emojis from your bot's config to Discord application emojis
- Web UI for managing and syncing emojis
- Default local URL: http://localhost:3077

## Tech Stack
- **discord.js v14** - Discord API library
- **discord-hybrid-sharding** - Hybrid sharding for scalability
- **drizzle-orm** & **@neondatabase/serverless** - Neon Serverless Postgres database ODM
- **kazagumo & shoukaku** - Music player system
- **canvacard, canvafy, musicard** - Image/graphics libraries
- **express (dashboard/emoji-manager)** - Web server
- **topgg-sdk** - Top.gg integration
- **dokdo** - Debug/eval command

## Installation

1. **Clone or download the repository**
2. **Install dependencies**
   ```bash
   npm install
   ```
3. **Configure environment variables** - Create a `.env` file in the root directory (see Configuration section)
4. **Set up Neon Postgres** - Create a project on Neon.tech and get your database connection string
5. **Run Migrations**
   ```bash
   npx drizzle-kit push
   ```
6. **Set up Lavalink** - Have a Lavalink server running for music features
7. **Start the bot**
   ```bash
   npm start
   ```

## Configuration
Create a `.env` file in the root directory with the following variables (at minimum):

```env
# Discord Bot
DISCORD_TOKEN=your-bot-token
DISCORD_CLIENT_ID=your-bot-client-id
DISCORD_CLIENT_SECRET=your-bot-client-secret
OWNER_ID=your-discord-user-id
PREFIX=!

# Database
DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require

# Lavalink
NODE_URL=localhost:2333
NODE_NAME=main
NODE_AUTH=youshallnotpass

# Spotify (optional)
SPOTIFY_ID=your-spotify-client-id
SPOTIFY_SECRET=your-spotify-client-secret

# Dashboard (optional)
DASHBOARD_ENABLED=true
DASHBOARD_PORT=3000
```

See `src/config.js` for all available configuration options.

## Requirements
- Node.js 18+
- Neon Serverless Postgres database
- Lavalink server (for music features)
