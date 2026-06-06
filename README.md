# DSC SRM RMP Discord Bot

A feature-rich, all-in-one Discord bot with music, moderation, anti-nuke, automation, and much more! Built with discord.js v14, MongoDB for data persistence, and hybrid sharding for scalability.

## Description
DSC SRM RMP is a complete Discord bot solution that offers:
- Advanced music system with Kazagumo & Shoukaku
- Comprehensive anti-nuke protection
- Powerful moderation tools
- Automation features (auto-responder, auto-react, auto-role, etc.)
- Built-in web dashboard for easy management
- Emoji Manager for managing Discord application emojis
- Premium features with leveling, sticky messages, and more

## Features

### 🎵 Music System
- Powered by Kazagumo & Shoukaku
- Supports YouTube, Spotify, SoundCloud, and more via Lavalink
- Playlists, audio filters (8D, bassboost, nightcore, etc.), lyrics, and voice commands
- 24/7 mode, autoplay, loop, shuffle, seek, and more
- Both prefix commands and slash commands available

### �️ Anti-Nuke & Security
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

### ⚙️ Automation
- Auto-responder: Custom message triggers and replies
- Auto-react: Automatic reactions to messages
- Auto-role: Assign roles on member join
- Voice roles: Assign roles based on voice channel activity
- Welcome system: Custom welcome messages and banners
- AFK system
- Leveling system (premium)

### 🎉 Fun & Utility
- Games (8ball, coinflip, rps, etc.)
- Memes, text-to-emoji, and interactive commands
- Image manipulation commands (kiss, hug, slap, etc.)
- User profiles with bio and badges
- Server banners, icons, and more

### 📊 Dashboard
- Built-in web dashboard for easy bot management
- Discord OAuth2 login
- Server management
- Settings configuration
- Default local URL: http://localhost:3000

### 😊 Emoji Manager
- Standalone emoji management server
- Sync emojis from your bot's config to Discord application emojis
- Web UI for managing and syncing emojis
- Default local URL: http://localhost:3077

## Project Structure
```
dsc/
├── emoji-manager/          # Standalone emoji manager server
│   ├── public/             # Frontend files for emoji manager
│   ├── package.json
│   └── server.js
├── src/
│   ├── commands/           # Prefix-based commands organized by category
│   │   ├── Antinuke/
│   │   ├── Automod/
│   │   ├── Config/
│   │   ├── Extra/
│   │   ├── Fun/
│   │   ├── Image/
│   │   ├── Information/
│   │   ├── Moderation/
│   │   ├── Music/
│   │   ├── Owner/
│   │   ├── Pfps/
│   │   ├── Playlist/
│   │   ├── Profile/
│   │   ├── Role/
│   │   ├── Utility/
│   │   ├── Voice/
│   │   └── Welcome/
│   ├── custom/             # Custom utilities (buttons, embeds, etc.)
│   ├── dashboard/          # Web dashboard server and frontend
│   ├── events/             # Event handlers
│   │   ├── Antinuke/
│   │   ├── AutoMod/
│   │   ├── Client/
│   │   ├── Node/
│   │   └── Players/
│   ├── loaders/            # Module loaders
│   ├── schema/             # MongoDB schemas
│   ├── slashCommands/      # Slash commands organized by category
│   ├── structures/         # Custom client structures
│   ├── utils/              # Utility functions
│   └── config.js           # Bot configuration
├── .gitignore
├── README.md
├── Shard.js                # Sharding manager entry point
├── index.js                # Bot main entry point
├── package-lock.json
└── package.json
```

## Tech Stack
- **discord.js v14** - Discord API library
- **discord-hybrid-sharding** - Hybrid sharding for scalability
- **mongoose** - MongoDB ODM
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
4. **Set up MongoDB** - Have a MongoDB instance running locally or use MongoDB Atlas
5. **Set up Lavalink** - Have a Lavalink server running for music features
6. **Start the bot**
   ```bash
   npm start
   ```

## Configuration
Create a `.env` file in the root directory with the following variables (at minimum):

```env
# Discord Bot
DISCORD_TOKEN=your-bot-token
DISCORD_CLIENT_ID=your-bot-client-id
OWNER_ID=your-discord-user-id

# MongoDB
MONGO_URI=mongodb://localhost:27017/dsc

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

## Emoji Manager
The emoji manager is a standalone server that helps manage Discord application emojis. To run it:
1. Navigate to the emoji-manager directory
2. Run `npm start` or `node server.js`
3. Open http://localhost:3077 in your browser

## Requirements
- Node.js 18+
- MongoDB server
- Lavalink server (for music features)

## Modified by SrivarsanK
