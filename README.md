# DSC SRM RMP Discord Bot

<div align="center">
    <a href="https://bot.developerstudents.club/">
        <svg viewBox="0 0 100 100" width="120" height="120" style="color: #7c4dff; filter: drop-shadow(0px 4px 10px rgba(124, 77, 255, 0.4));">
            <path d="M50,10 L80,25 L80,55 L50,90 L20,55 L20,25 Z" fill="none" stroke="currentColor" stroke-width="6" stroke-linejoin="round"/>
            <path d="M50,22 L72,34 L72,52 L50,78 L28,52 L28,34 Z" fill="currentColor"/>
            <polygon points="50,30 38,48 48,48 44,70 62,45 52,45" fill="#ffffff"/>
        </svg>
    </a>
</div>

<br />

<div align="center">

[![forthebadge](https://forthebadge.com/images/badges/made-with-javascript.svg)](https://javascript.info/)
[![forthebadge](https://forthebadge.com/images/badges/built-with-love.svg)](https://github.com/dsc-srmrmp/newdiscordbot)
<br />
[![Discord Support](https://img.shields.io/discord/5uyYvpKSJH?color=5865F2&label=Support%20Server&logo=discord&logoColor=white&style=flat-square)](https://discord.gg/5uyYvpKSJH)
[![Dashboard Website](https://img.shields.io/website-up-down-green-red/https/bot.developerstudents.club.svg?style=flat-square&label=Dashboard)](https://bot.developerstudents.club/)
[![NodeJS Version](https://img.shields.io/badge/node-%3E%3D18.0.0-blue.svg?style=flat-square&logo=node.js)](https://nodejs.org)
[![Database Neon](https://img.shields.io/badge/database-Neon_Postgres-00e599?style=flat-square&logo=postgresql&logoColor=white)](https://neon.tech)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square)](https://opensource.org/licenses/MIT)

</div>

> **DSC SRM RMP Discord Bot** is a premium, feature-rich, all-in-one Discord bot featuring advanced music playback, active anti-nuke server security, robust auto-moderation, a modern leveling system, custom profiles, and automated log verification.
> 
> All features are configurable through a highly responsive glassmorphic web dashboard hosted at `https://bot.developerstudents.club`, powered by Drizzle ORM and Neon Serverless Postgres.

---

## 🖼️ Interface Previews

<div align="center">
  <p align="center">
    <b>Landing Page Interface</b><br>
    <img src="./assets/landing_page.png" width="800" alt="Landing Page Preview" style="border-radius: 8px; border: 1px solid #333;"><br><br>
    <b>Interactive Configuration Dashboard</b><br>
    <img src="./assets/dashboard_initial.png" width="800" alt="Main Dashboard View" style="border-radius: 8px; border: 1px solid #333;"><br><br>
    <b>Server Prefix Configuration</b><br>
    <img src="./assets/prefix_setup.png" width="800" alt="Settings Configuration Setup" style="border-radius: 8px; border: 1px solid #333;"><br><br>
    <b>Advanced Module Panel</b><br>
    <img src="./assets/dashboard_v2.png" width="800" alt="Advanced Module Dashboard View" style="border-radius: 8px; border: 1px solid #333;">
  </p>
</div>

---

## 🧠 Double-Gated LeetCode Verification System

A highly unique, automated coding challenge tracker featuring dual-gate validation to credit daily solves.

### 1. Account Binding (`/register` & `/verify`)
*   **Token Generation:** Run `/register <username>`. The bot generates a temporary token (`DSCRD-XXXXXX`).
*   **Verification:** Paste this token into your **LeetCode Profile README (About Me)** section and run `/verify`. The bot queries the LeetCode profile, extracts the token, and links the accounts.

### 2. Solve Submission & OCR Validation (`/submit`)
*   **Gate 1 (Image OCR Reader):** Upload a screenshot of your accepted challenge solution. The bot uses `Tesseract.js` to read text from the image, looking for a unique challenge round code (nonce, e.g. `LC-XXXXXX`) embedded in the screenshot.
*   **Gate 2 (LeetCode API Check):** The bot queries LeetCode's submission records for the bound user to ensure the target problem was successfully solved and accepted within 24 hours of posting.
*   **Difficulty-Based Points:** Awards points based on difficulty (default points: Easy: 10, Medium: 20, Hard: 30).
*   **Dynamic Shoutouts:** Celebrates solved questions by posting the user's solution screenshot in the designated shoutout channel.
*   **Leaderboards:** Provides overall, weekly, and monthly points rankings using `/leaderboard` or `!leaderboard`.

---

## ✨ Features & Bot Capabilities

### 🎵 High-Fidelity Music System & Playlist Manager
- **Lavalink Backed:** Powered by Shoukaku and Kazagumo for buffer-free playback.
- **Multi-Source Support:** Play tracks from YouTube, Spotify, SoundCloud, and custom URLs.
- **Audio Filters:** Apply real-time filters including 8D, Bassboost, Nightcore, Vaporwave, and Pitch.
- **Custom Playlists:** Save current queues into private playlists, list, rename, delete, and load them using `!playlist`.
- **Playlist Sharing:** Share your created playlist directly with other guild members using `!plshare`.

### 🛡️ Security & Anti-Nuke Guard
- **Mass Action Prevention:** Automatically detects and blocks mass bans, kicks, role deletes, and channel deletes.
- **Asset Protection:** Anti-everyone/here mention protection, webhook alteration guards, and emoji/sticker change security.
- **Access Control:** Custom Whitelist system allowing trusted users to bypass security measures.
- **Anti-Bot Add:** Blocks unauthorized bots from joining and auto-kicks them.
- **Extra Owners:** Assign extra owner roles to manage security settings using `!extraowner`.

### ⚙️ Automation & Engagement
- **Auto-Responder & React:** Trigger custom text replies or emoji reactions based on keywords.
- **Auto-Role:** Failsafe role assignment for humans and bots upon server join with API backup.
- **Voice Roles:** Configure roles to assign or remove dynamically when users join or leave voice channels (`!invcrole`).
- **Welcome System:** High-impact welcome banners generated dynamically on canvas.
- **VC Guard & Sticky Messages:** Protect specific voice channels with bypass roles; keep critical announcements pinned at the bottom of active channels.
- **Leveling System:** Track voice and text XP with level-up banner notifications.

### 📝 Interactive Log Verification System
- **Forum & Thread Support:** Direct logs to normal text channels, thread channels, or parent forum channels.
- **Channel Verification:** Secure verification token system (`!verify-log <token>`) to hook target log channels.
- **Custom Filters:** Event ignore lists for specific channels, roles, or users, with ignore options for embeds.
- **Event Categories:** Message (Edits/Deletes), Channels, Roles, Members (Profile/Activity), Voice States, Thread states, Invites, and Moderation events.

### 🔊 Advanced Voice Utilities
- **Bulk Voice Actions:** Bulk deafen, mute, unmute, or undeafen members in your current channel.
- **Voice Management:** Move all members in a channel to a target channel (`!vcmoveall`), or kick members from a voice session (`!vckick`, `!vckickall`).

### 🖼️ Profile Customizer & PFP Utilities
- **Custom User Profiles:** Customize bios, descriptions, and social media links via `!bioset` and display them via `!bioshow`.
- **Badge Systems:** Award and display special custom badges on member profiles.
- **Avatar Finder:** Fetch random high-quality anime profile pictures (`!animes`), anime banners (`!banners`), boys avatars (`!boys`), couple avatar matching icons (`!couples`), or girls avatars (`!girls`).

### 😊 Emoji Manager
- **Standalone Dashboard:** Connects to your configured emoji manager panel.
- **Sync System:** Synchronize your bot config application emojis directly to Discord application emojis.

### 🛠️ Developer Console
- **Dokdo Integration:** safe code execution, eval commands, and live terminal testing for bot developers.

---

## 🛠️ Technology Stack

- **Engine:** [Discord.js v14](https://discord.js.org/) — Node.js library interacting with the Discord Gateway API.
- **Database:** [Neon Postgres](https://neon.tech/) — Serverless postgres database managed with [Drizzle ORM](https://orm.drizzle.team/).
- **Sharding:** [discord-hybrid-sharding](https://github.com/mfontanini/discord-hybrid-sharding) — Process-based hybrid sharding for massive scale.
- **OCR Reader:** [Tesseract.js](https://tesseract.projectnaptha.com/) — Reads solution nonces from screenshot uploads.
- **Audio Engine:** [Kazagumo](https://github.com/Takiyo56/Kazagumo) & [Shoukaku](https://github.com/Deivu/Shoukaku) — Lavalink client wrapper for robust playback.
- **Graphics Engine:** [Canvacard](https://github.com/LachlanDev/Canvacard) & [Canvafy](https://github.com/Canvafy/canvafy) — Premium banner and rank card graphics generator.
- **Web App:** Express.js — Serves the landing page and settings panel dashboard.

---

## 📂 Repository Structure

```
├── .env.example               # Environment variables template
├── Shard.js                   # Bot cluster sharding manager
├── index.js                   # Core bot client initialization
├── migrate-leetcode.js        # Script to migrate LeetCode db schema
├── migrate-server-stats.js    # Script to migrate Server Stats db schema
├── update-and-start.sh        # Oracle Linux PM2 deployment script
├── assets/                    # Dashboard and landing page screenshots
├── docs/                      # Developer guides and system documentation
├── src/
│   ├── config.js              # Environment parser and static config
│   ├── commands/              # Bot Prefix Commands
│   │   ├── Antinuke/          # Security rules, extra owners, & whitelists
│   │   ├── Automod/           # Anti-link and anti-spam configurations
│   │   ├── Config/            # Prefix, auto-responder, logging, stats configuration
│   │   ├── Fun/               # Fun and games commands (8ball, RPS, rate, coinflip)
│   │   ├── Image/             # Image manipulation (achievement, instagram, meeting, ship)
│   │   ├── LeetCode/          # Solve tracking, question posting, leaderboards
│   │   ├── Music/             # Lavalink audio playback and filters
│   │   ├── Pfps/              # Anime/Boys/Couples/Girls avatar generators
│   │   ├── Playlist/          # Private playlist saving and loading
│   │   ├── Profile/           # User bios and customized socials
│   │   ├── Role/              # Auto-roles, custom roles, and voice roles
│   │   ├── Utility/           # Snipe, avatar button displays, server & user information
│   │   ├── Voice/             # Voice channel bulk management commands
│   │   └── Welcome/           # Custom canvas join-banner setup
│   ├── slashCommands/         # Bot Slash Commands mapping prefix actions
│   ├── events/                # Gateway client event handlers
│   ├── db/                    # Drizzle connection and neon client setup
│   ├── schema/                # Drizzle ORM Database Schema tables
│   ├── loaders/               # Commands, buttons, and slash handlers loader
│   ├── structures/            # Custom client extensions (MusicClient.js)
│   └── dashboard/             # Express Web Application
│       ├── public/            # Static files (HTML, CSS, JS)
│       └── server.js          # OAuth2 login & API routes
```

---

## 🚀 Installation & Setup

### Prerequisites
*   [Node.js](https://nodejs.org/) v18.0.0 or higher
*   [PostgreSQL Database](https://neon.tech/) (or a Neon Serverless instance)
*   [Lavalink Server](https://github.com/lavalink-devs/Lavalink) (to power the music system)

### 1. Clone the Repository
```bash
git clone https://github.com/dsc-srmrmp/newdiscordbot.git
cd newdiscordbot
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment
Create a `.env` file in the root directory (refer to `.env.example` for details):
```env
# Bot Credentials
DISCORD_TOKEN=your_bot_token
DISCORD_CLIENT_ID=your_client_id
DISCORD_CLIENT_SECRET=your_client_secret
OWNER_ID=your_owner_id
PREFIX=>

# Database Connection
DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require

# Lavalink configuration
NODE_URL=your_lavalink_host:port
NODE_NAME=MainNode
NODE_AUTH=youshallnotpass
NODE_SECURE=true

# Dashboard setup
DASHBOARD_ENABLED=true
DASHBOARD_PORT=3000
DASHBOARD_PUBLIC_URL=https://bot.developerstudents.club
```

### 4. Push Database Schemas
Sync the Drizzle schemas with your PostgreSQL/Neon instance:
```bash
npx drizzle-kit push
```

### 5. Launch the Application
Run the sharded client in development mode or start it in production:
```bash
# Development (with nodemon auto-restart)
npm run dev

# Production
npm start
```

---

## 🔄 Deployment & Automation

The bot features a deployment script (`update-and-start.sh`) designed for Oracle Linux/Ubuntu VPS environments under PM2:
*   Automatically fetches and pulls updates from `main` branch.
*   Installs dependencies and runs necessary migrations.
*   Starts/reloads the bot process using PM2.

```bash
chmod +x update-and-start.sh
./update-and-start.sh
```

---

## 📄 License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.
