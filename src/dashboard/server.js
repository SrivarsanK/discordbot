const crypto = require("crypto");
const fs = require("fs");
const http = require("http");
const path = require("path");
const { URL } = require("url");
const { ChannelType, PermissionsBitField } = require("discord.js");
const { isBotOwner } = require("../utils/owners");

const Prefix = require("../schema/prefix");
const AntiNuke = require("../schema/antinuke");
const AntiLink = require("../schema/antilink");
const AntiSpam = require("../schema/antispam");
const AutoRole = require("../schema/autorole");
const VoiceRole = require("../schema/voicerole");
const Roles = require("../schema/roles");
const IgnoreChannel = require("../schema/ignorechannel");
const AutoReconnect = require("../schema/247");
const WelcomeSettings = require("../schema/welcomesystem");
const PremiumSettings = require("../schema/premiumSettings");
const Logging = require("../schema/logging");
const LeetcodeServerConfig = require("../schema/leetcodeServerConfig");
const {
  clearPremiumSettingsCache,
} = require("../utils/premiumFeatures");
const { normalizeWelcomeDynamicImages } = require("../utils/welcomeImage");

const { getDb } = require("../db/client");
const { dashboardSessions } = require("../db/schema");
const { eq, lt } = require("drizzle-orm");

const PUBLIC_DIR = path.join(__dirname, "public");
const MANAGE_GUILD = 0x20n;
const ADMINISTRATOR = 0x8n;
const MAX_BODY_BYTES = 10 * 1024 * 1024;
const SNOWFLAKE = /^\d{16,22}$/;

// In-memory session cache (survives individual requests, cleared on restart)
// DB is the source of truth — cache just avoids repeated DB reads per request
const sessionCache = new Map();
const SESSION_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const oauthStates = new Map();
let serverInstance = null;

async function startDashboard(client) {
  const config = client.config.dashboard || {};
  if (!config.enabled) return null;

  const currentCluster = Number(process.env.CLUSTER || 0);
  if (currentCluster !== Number(config.clusterId || 0)) {
    client.logger?.log(
      `[Dashboard] Skipped on cluster ${currentCluster}; configured for cluster ${config.clusterId}.`,
      "log",
    );
    return null;
  }

  if (serverInstance) return serverInstance;

  cleanupStores(config.sessionTtlMs);
  setInterval(() => cleanupStores(config.sessionTtlMs), 1000 * 60 * 30).unref();

  const server = http.createServer((req, res) => {
    handleRequest(client, req, res).catch((error) => {
      client.logger?.log(`[Dashboard] ${error.stack || error}`, "error");
      sendJson(res, 500, { error: "Internal dashboard error" });
    });
  });

  server.on("error", (error) => {
    client.logger?.log(`[Dashboard] Failed to start: ${error.message}`, "error");
  });

  await new Promise((resolve) => {
    server.listen(config.port, config.host, resolve);
  });

  serverInstance = server;
  client.dashboardServer = server;
  client.logger?.log(`[Dashboard] Ready at ${config.publicUrl}`, "ready");
  return server;
}

async function handleRequest(client, req, res) {
  const config = client.config.dashboard || {};
  const url = new URL(req.url, config.publicUrl || "http://localhost:3000");
  client.logger?.log(`[Dashboard] ${req.method} ${url.pathname}`, "log");

  if (req.method === "GET" && url.pathname === "/login") {
    return redirectToDiscord(client, res);
  }

  if (req.method === "GET" && url.pathname === "/auth/callback") {
    return handleCallback(client, req, res, url);
  }

  if (req.method === "POST" && url.pathname === "/logout") {
    return logout(client, req, res);
  }

  if (url.pathname.startsWith("/api/")) {
    return handleApi(client, req, res, url);
  }

  if (req.method === "GET" && url.pathname === "/" && url.search === "") {
    return serveStatic(res, path.join(PUBLIC_DIR, "landing.html"));
  }

  if (req.method === "GET" && url.pathname.startsWith("/assets/")) {
    return serveStatic(res, path.join(PUBLIC_DIR, url.pathname.replace(/^\/assets\//, "")));
  }


  if (req.method === "GET") {
    return serveStatic(res, path.join(PUBLIC_DIR, "index.html"));
  }

  sendJson(res, 405, { error: "Method not allowed" });
}

function redirectToDiscord(client, res) {
  const config = client.config.dashboard || {};
  const state = crypto.randomBytes(24).toString("hex");
  oauthStates.set(state, Date.now());

  const authorize = new URL("https://discord.com/oauth2/authorize");
  authorize.searchParams.set("client_id", client.config.clientId);
  authorize.searchParams.set("redirect_uri", `${config.publicUrl}/auth/callback`);
  authorize.searchParams.set("response_type", "code");
  authorize.searchParams.set("scope", "identify guilds");
  authorize.searchParams.set("state", state);
  res.writeHead(302, { Location: authorize.toString() });
  res.end();
}

async function handleCallback(client, req, res, url) {
  const config = client.config.dashboard || {};
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (!code || !state || !oauthStates.has(state)) {
    return redirect(res, "/dashboard?auth=failed");
  }

  oauthStates.delete(state);

  try {
    const token = await exchangeCode(client, code);
    const [user, guilds] = await Promise.all([
      discordFetch(client, "/users/@me", token.access_token),
      discordFetch(client, "/users/@me/guilds", token.access_token),
    ]);

    const sessionId = crypto.randomBytes(32).toString("hex");
    const sessionData = {
      user,
      guilds: Array.isArray(guilds) ? guilds : [],
      accessToken: token.access_token,
      refreshToken: token.refresh_token,
      expiresAt: Date.now() + Number(token.expires_in || 604800) * 1000,
      createdAt: Date.now(),
      touchedAt: Date.now(),
    };

    // Strip OAuth tokens before persisting to DB — tokens are not needed
    // server-side after the initial user/guild fetch.  Keeping them in the DB
    // would expose them if the database is ever read by a third party.
    const sessionDataForDb = {
      user: sessionData.user,
      guilds: sessionData.guilds,
      expiresAt: sessionData.expiresAt,
      createdAt: sessionData.createdAt,
      touchedAt: sessionData.touchedAt,
    };

    // Persist session to DB so it survives restarts
    try {
      const db = getDb();
      await db.insert(dashboardSessions).values({
        sessionId,
        userId: user.id,
        data: sessionDataForDb,
        expiresAt: new Date(sessionData.expiresAt),
        touchedAt: new Date(sessionData.touchedAt),
      }).onConflictDoUpdate({
        target: dashboardSessions.sessionId,
        set: {
          data: sessionDataForDb,
          expiresAt: new Date(sessionData.expiresAt),
          touchedAt: new Date(sessionData.touchedAt),
        },
      });
      // Warm the in-memory cache with the full session (tokens kept in memory only)
      sessionCache.set(sessionId, { data: sessionData, cachedAt: Date.now() });
    } catch (dbErr) {
      client.logger?.log(`[Dashboard] Session DB write failed: ${dbErr.message}`, "warn");
      // Fall back to in-memory only
      sessionCache.set(sessionId, { data: sessionData, cachedAt: Date.now() });
    }

    res.writeHead(302, {
      Location: "/dashboard?choose=server",
      "Set-Cookie": buildCookie(client, sessionId, req),
    });
    res.end();
  } catch (error) {
    client.logger?.log(`[Dashboard] OAuth failed: ${error.message}`, "warn");
    redirect(res, "/dashboard?auth=failed");
  }
}

async function exchangeCode(client, code) {
  const config = client.config.dashboard || {};
  const body = new URLSearchParams();
  body.set("client_id", client.config.clientId);
  body.set("client_secret", client.config.clientSecret);
  body.set("grant_type", "authorization_code");
  body.set("code", code);
  body.set("redirect_uri", `${config.publicUrl}/auth/callback`);

  const response = await timedFetch(client, "https://discord.com/api/v10/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!response.ok) {
    throw new Error(`Discord token exchange failed (${response.status})`);
  }

  return response.json();
}

async function discordFetch(client, route, token) {
  const response = await timedFetch(client, `https://discord.com/api/v10${route}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error(`Discord API ${route} failed (${response.status})`);
  }

  return response.json();
}

async function timedFetch(client, url, options = {}) {
  const timeoutMs = client.config.dashboard?.requestTimeoutMs || 10000;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function handleApi(client, req, res, url) {
  const session = await getSession(client, req);
  if (!session) return sendJson(res, 401, { error: "Not logged in" });

  if (req.method === "GET" && url.pathname === "/api/me") {
    return sendJson(res, 200, {
      user: formatUser(session.user),
      bot: formatBot(client),
      guilds: getManageableGuilds(client, session),
    });
  }

  const tokenMatch = url.pathname.match(/^\/api\/guilds\/(\d{16,22})\/verify-log-token$/);
  if (tokenMatch) {
    const guildId = tokenMatch[1];
    const access = requireGuildAccess(client, session, guildId);
    if (!access.ok) return sendJson(res, access.status, { error: access.error });

    if (req.method === "POST") {
      const body = await readJsonBody(req);
      const eventKey = body.eventKey;
      if (!eventKey) return sendJson(res, 400, { error: "Missing eventKey" });

      const { generateVerificationToken } = require("../utils/logSender");
      const token = await generateVerificationToken(guildId, eventKey);
      if (!token) return sendJson(res, 500, { error: "Failed to generate token" });

      return sendJson(res, 200, { token });
    }
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  const guildMatch = url.pathname.match(/^\/api\/guilds\/(\d{16,22})(?:\/settings)?$/);
  if (!guildMatch) {
    return sendJson(res, 404, { error: "Not found" });
  }

  const guildId = guildMatch[1];
  const access = requireGuildAccess(client, session, guildId);
  if (!access.ok) return sendJson(res, access.status, { error: access.error });

  if (req.method === "GET" && url.pathname === `/api/guilds/${guildId}`) {
    const payload = await buildGuildPayload(client, guildId, session);
    return sendJson(res, 200, payload);
  }

  if (req.method === "PUT" && url.pathname === `/api/guilds/${guildId}/settings`) {
    const body = await readJsonBody(req);
    await saveGuildSettings(client, guildId, body, session);
    const payload = await buildGuildPayload(client, guildId, session);
    return sendJson(res, 200, { ok: true, ...payload });
  }

  sendJson(res, 405, { error: "Method not allowed" });
}

function logout(client, req, res) {
  const cookieName = client.config.dashboard?.cookieName || "dsc_dashboard";
  const sessionId = readCookie(req, cookieName);
  if (sessionId) {
    sessionCache.delete(sessionId);
    // Delete from DB asynchronously
    try {
      const db = getDb();
      db.delete(dashboardSessions).where(eq(dashboardSessions.sessionId, sessionId)).catch(() => null);
    } catch {}
  }
  res.writeHead(204, {
    "Set-Cookie": clearCookie(client),
  });
  res.end();
}

async function getSession(client, req) {
  if (process.env.MOCK_DASHBOARD === "true") {
    const devSessionId = "dev-session-id";
    if (!sessionCache.has(devSessionId)) {
      sessionCache.set(devSessionId, {
        cachedAt: Date.now(),
        data: {
          user: {
            id: "1067443868355809341",
            username: "developer",
            global_name: "Developer Admin",
            avatar: "mock-avatar",
            avatarCandidates: ["https://cdn.discordapp.com/avatars/1067443868355809341/mock-avatar.png"],
          },
          guilds: [
            {
              id: "123456789012345678",
              name: "RawBlock Guild",
              icon: "mock-icon",
              iconCandidates: ["https://cdn.discordapp.com/icons/123456789012345678/mock-icon.png"],
              owner: true,
              permissions: "2147483647",
              installed: true,
              memberCount: 1337,
            },
            {
              id: "876543210987654321",
              name: "Free Guild",
              icon: "mock-icon",
              iconCandidates: ["https://cdn.discordapp.com/icons/876543210987654321/mock-icon.png"],
              owner: false,
              permissions: "0",
              installed: false,
              memberCount: 200,
            }
          ],
          accessToken: "dev-token",
          refreshToken: "dev-token",
          expiresAt: Date.now() + 999999999,
          createdAt: Date.now(),
          touchedAt: Date.now(),
        },
      });
    }
    return sessionCache.get(devSessionId).data;
  }

  const cookieName = client.config.dashboard?.cookieName || "dsc_dashboard";
  const sessionId = readCookie(req, cookieName);
  client.logger?.log(`[Dashboard Debug] getSession cookieName: ${cookieName}, sessionId found: ${sessionId ? "yes (length: " + sessionId.length + ")" : "no"}`, "log");
  if (!sessionId) return null;

  // Check in-memory cache first
  const cached = sessionCache.get(sessionId);
  if (cached && Date.now() - cached.cachedAt < SESSION_CACHE_TTL) {
    const session = cached.data;
    const ttl = client.config.dashboard?.sessionTtlMs || 604800000;
    if (Date.now() - session.touchedAt > ttl || Date.now() > session.expiresAt) {
      client.logger?.log(`[Dashboard Debug] Session in-memory cache expired (touchedAt: ${session.touchedAt}, expiresAt: ${session.expiresAt})`, "log");
      sessionCache.delete(sessionId);
      return null;
    }
    session.touchedAt = Date.now();
    client.logger?.log(`[Dashboard Debug] Session found in-memory cache`, "log");
    return session;
  }

  // Load from DB
  try {
    const db = getDb();
    const rows = await db.select().from(dashboardSessions)
      .where(eq(dashboardSessions.sessionId, sessionId))
      .limit(1);

    if (!rows.length) {
      client.logger?.log(`[Dashboard Debug] Session ID not found in DB`, "log");
      return null;
    }

    const row = rows[0];
    const session = row.data;
    const ttl = client.config.dashboard?.sessionTtlMs || 604800000;

    if (!session || Date.now() - session.touchedAt > ttl || Date.now() > session.expiresAt) {
      client.logger?.log(`[Dashboard Debug] Session in DB expired. Cleaning up.`, "log");
      // Session expired — clean up
      await db.delete(dashboardSessions).where(eq(dashboardSessions.sessionId, sessionId)).catch(() => null);
      return null;
    }

    session.touchedAt = Date.now();
    // Update touchedAt in DB (fire and forget)
    db.update(dashboardSessions)
      .set({ touchedAt: new Date(), data: session })
      .where(eq(dashboardSessions.sessionId, sessionId))
      .catch(() => null);

    // Warm cache
    sessionCache.set(sessionId, { data: session, cachedAt: Date.now() });
    client.logger?.log(`[Dashboard Debug] Session loaded from DB and cached`, "log");
    return session;
  } catch (dbErr) {
    client.logger?.log(`[Dashboard] Session DB read failed: ${dbErr.message}`, "warn");
    return null;
  }
}

function requireGuildAccess(client, session, guildId) {
  const guild = client.guilds.cache.get(guildId);
  if (!guild) return { ok: false, status: 404, error: "Bot is not in this server" };

  if (isBotOwner(client, session.user?.id)) return { ok: true };

  const userGuild = session.guilds.find((item) => item.id === guildId);
  if (!userGuild) return { ok: false, status: 403, error: "Server is not in your Discord account" };

  if (userGuild.owner) return { ok: true };

  const permissions = BigInt(userGuild.permissions || 0);
  if ((permissions & MANAGE_GUILD) === MANAGE_GUILD || (permissions & ADMINISTRATOR) === ADMINISTRATOR) {
    return { ok: true };
  }

  return { ok: false, status: 403, error: "You need Manage Server permission" };
}

function getManageableGuilds(client, session) {
  const inviteBaseUrl = getBotInviteUrl(client);

  if (isBotOwner(client, session.user?.id)) {
    const items = new Map();

    client.guilds.cache.forEach((guild) => {
      items.set(guild.id, formatGuildListItem(client, guild, { owner: true, installed: true, inviteBaseUrl }));
    });

    for (const guild of session.guilds || []) {
      if (!canManageDiscordGuild(guild)) continue;
      const installedGuild = client.guilds.cache.get(guild.id);
      items.set(
        guild.id,
        formatGuildListItem(client, installedGuild || guild, {
          owner: Boolean(guild.owner) || Boolean(installedGuild?.ownerId === session.user?.id),
          installed: Boolean(installedGuild),
          inviteBaseUrl,
        }),
      );
    }

    return [...items.values()]
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  return session.guilds
    .filter(canManageDiscordGuild)
    .map((guild) => {
      const installedGuild = client.guilds.cache.get(guild.id);
      return formatGuildListItem(client, installedGuild || guild, {
        owner: Boolean(guild.owner),
        installed: Boolean(installedGuild),
        inviteBaseUrl,
      });
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

function canManageDiscordGuild(guild) {
  if (guild.owner) return true;
  const permissions = BigInt(guild.permissions || 0);
  return (permissions & MANAGE_GUILD) === MANAGE_GUILD || (permissions & ADMINISTRATOR) === ADMINISTRATOR;
}

async function buildGuildPayload(client, guildId, session) {
  const guild = client.guilds.cache.get(guildId);
  if (!guild) throw new Error(`Guild ${guildId} missing from cache`);

  await hydrateGuild(guild);

  const settings = await loadGuildSettings(client, guild);
  const premium = await buildPremiumPayload(guildId, session?.user?.id);
  settings.premium.branding = { enabled: false, nickname: "" };
  const viewer = await formatViewer(client, guild, session);
  return {
    guild: formatGuild(guild),
    bot: formatBot(client),
    viewer,
    channels: formatChannels(guild),
    roles: formatRoles(guild),
    premium,
    settings,
    commands: commandStats(client),
  };
}

async function hydrateGuild(guild) {
  await Promise.all([
    guild.channels.fetch().catch(() => null),
    guild.roles.fetch().catch(() => null),
  ]);
}

async function loadGuildSettings(client, guild) {
  if (process.env.MOCK_DASHBOARD === "true") {
    return {
      prefix: "!",
      ignoreChannels: ["c2"],
      welcome: {
        enabled: true,
        channel: "c1",
        content: "Welcome {user} to {server_name}!",
        autodel: 0,
        embed: {
          enabled: true,
          title: "Welcome to the server!",
          description: "We hope you enjoy your stay.",
          color: "#000000",
          thumbnail: "",
          image: "",
          footer: "RawBlock Bot",
        },
        dynamicImages: {
          enabled: true,
          attachedId: "default",
          templates: [
            {
              id: "default",
              name: "Default Template",
              layers: [
                { id: "background", type: "background", color: "#ffffff" },
                { id: "avatar", type: "avatar", x: 50, y: 50, radius: 50 },
                { id: "text", type: "text", content: "Welcome!", x: 150, y: 80, font: "Archivo Black", size: 32 },
              ],
            }
          ],
        },
      },
      automod: {
        antilink: {
          isEnabled: true,
          whitelistUsers: [],
          whitelistRoles: ["r1"],
        },
        antispam: {
          isEnabled: false,
          messageThreshold: 5,
          timeframe: 10,
          whitelistUsers: [],
          whitelistRoles: [],
        },
      },
      antinuke: {
        isEnabled: true,
        logChannelId: "c1",
        extraOwners: ["1067443868355809341"],
        whitelistUsers: [],
        whitelistRoles: [],
      },
      autorole: {
        humanRoles: ["r3"],
        botRoles: [],
      },
      voiceRole: {
        roleId: "",
      },
      roles: {
        reqrole: "",
        official: "",
        friend: "",
        guest: "",
        girl: "",
        vip: "",
      },
      music247: {
        enabled: true,
        textChannelId: "c1",
        voiceChannelId: "c2",
      },
      premium: {
        branding: { enabled: true, nickname: "RAW BOT" },
        leveling: {
          enabled: true,
          chatEnabled: true,
          voiceEnabled: true,
          announceChannelId: "c1",
          levelUpMessage: "{user} leveled up to {level}!",
          chatXpMin: 5,
          chatXpMax: 15,
          chatCooldownSeconds: 60,
          voiceXpPerMinute: 3,
        },
        vcGuard: {
          enabled: true,
          protectedChannels: ["c2"],
          bypassRoles: ["r1"],
          logChannelId: "c1",
          action: "disconnect",
          message: "No entry!",
        },
        sticky: {
          enabled: true,
          messages: [
            { channelId: "c1", content: "Keep it brutalist!", cooldownSeconds: 10 },
          ],
        },
      },
    };
  }

  const guildId = guild.id;
  const [
    prefix,
    antinuke,
    antilink,
    antispam,
    autorole,
    voiceRole,
    roles,
    ignored,
    auto247,
    welcome,
    premiumSettings,
    logging,
    leetcodeConfig,
  ] = await Promise.all([
    Prefix.findOne({ guildId }).lean(),
    AntiNuke.findOne({ guildId }).lean(),
    AntiLink.findOne({ guildId }).lean(),
    AntiSpam.findOne({ guildId }).lean(),
    AutoRole.findOne({ guildId }).lean(),
    VoiceRole.findOne({ guildId }).lean(),
    Roles.findOne({ guildId }).lean(),
    IgnoreChannel.findOne({ guildId }).lean(),
    AutoReconnect.findOne({ guildId }).lean(),
    WelcomeSettings.getSettings(guild),
    PremiumSettings.findOneAndUpdate(
      { guildId },
      { $setOnInsert: { guildId } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ).lean(),
    Logging.findOneAndUpdate(
      { guildId },
      { $setOnInsert: { guildId } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ).lean(),
    LeetcodeServerConfig.findOneAndUpdate(
      { guildId },
      { $setOnInsert: { guildId } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ).lean(),
  ]);

  // antilink: schema uses `enabled` (bool) + `whitelist` (jsonb with {users,roles,mode})
  const antilinkData = antilink?.whitelist || {};
  // antispam: schema uses `enabled` (bool) + `whitelist` (jsonb with {users,roles}) + `threshold`
  const antispamWhitelist = antispam?.whitelist || {};
  // auto_role: schema uses single `roles` jsonb column storing {humanRoles, botRoles}
  const autoroleData = autorole?.roles || {};
  // voice_role: schema uses single `mappings` jsonb column storing {roleId}
  const voiceRoleData = voiceRole?.mappings || {};
  // roles: schema uses single `roles` jsonb column storing {reqrole, official, friend, guest, girl, vip}
  const rolesData = roles?.roles || {};
  // ignore_channel: schema uses single `channels` jsonb array column (one row per guild)
  const ignoredArr = Array.isArray(ignored?.channels) ? ignored.channels : (Array.isArray(ignored) ? ignored.flatMap((item) => item.channels || (item.channelId ? [item.channelId] : [])) : []);

  // Normalize any eventChannels mapping to use parent forum IDs if they point to threads under a forum
  const eventChannelsNormalized = { ...(logging?.eventChannels || {}) };
  for (const [key, channelId] of Object.entries(eventChannelsNormalized)) {
    if (channelId) {
      const channel = guild.channels.cache.get(channelId);
      if (channel && channel.isThread()) {
        const parent = channel.parent || await guild.channels.fetch(channel.parentId).catch(() => null);
        if (parent && parent.type === ChannelType.GuildForum) {
          eventChannelsNormalized[key] = parent.id;
        }
      }
    }
  }

  return {
    prefix: prefix?.prefix || prefix?.Prefix || client.prefix,
    ignoreChannels: ignoredArr.filter(Boolean),
    welcome: {
      enabled: Boolean(welcome?.welcome?.enabled),
      channel: welcome?.welcome?.channel || "",
      content: welcome?.welcome?.content || "Welcome {user} to {server_name}!",
      autodel: Number(welcome?.welcome?.autodel || 0),
      embed: {
        enabled: Boolean(welcome?.welcome?.embed?.enabled),
        title: welcome?.welcome?.embed?.title || "",
        description: welcome?.welcome?.embed?.description || "",
        color: welcome?.welcome?.embed?.color || "",
        thumbnail: welcome?.welcome?.embed?.thumbnail || "",
        image: welcome?.welcome?.embed?.image || "",
        footer: welcome?.welcome?.embed?.footer || "",
      },
      dynamicImages: normalizeWelcomeDynamicImages(welcome?.welcome?.dynamicImages || {}),
    },
    automod: {
      antilink: {
        isEnabled: Boolean(antilink?.enabled),
        whitelistUsers: antilinkData.users || [],
        whitelistRoles: antilinkData.roles || [],
      },
      antispam: {
        isEnabled: Boolean(antispam?.enabled),
        messageThreshold: Number(antispam?.threshold || 5),
        timeframe: Number(antispamWhitelist.timeframe || 10),
        whitelistUsers: antispamWhitelist.users || [],
        whitelistRoles: antispamWhitelist.roles || [],
      },
    },
    antinuke: {
      isEnabled: Boolean(antinuke?.isEnabled),
      logChannelId: antinuke?.logChannelId || "",
      extraOwners: antinuke?.extraOwners || [],
      whitelistUsers: antinuke?.whitelistUsers || [],
      whitelistRoles: antinuke?.whitelistRoles || [],
      disabledEvents: antinuke?.disabledEvents || [],
    },
    autorole: {
      humanRoles: autoroleData.humanRoles || [],
      botRoles: autoroleData.botRoles || [],
    },
    voiceRole: {
      roleId: voiceRoleData.roleId || "",
    },
    roles: {
      reqrole: rolesData.reqrole || "",
      official: rolesData.official || "",
      friend: rolesData.friend || "",
      guest: rolesData.guest || "",
      girl: rolesData.girl || "",
      vip: rolesData.vip || "",
    },
    music247: {
      enabled: Boolean(auto247),
      textChannelId: auto247?.textId || auto247?.TextId || "",
      voiceChannelId: auto247?.voiceId || auto247?.VoiceId || "",
    },
    premium: normalizePremiumSettings(premiumSettings || {}),
    logging: {
      isEnabled: Boolean(logging?.isEnabled),
      eventChannels: eventChannelsNormalized,
      ignoredChannels: logging?.ignoredChannels || [],
      ignoredRoles: logging?.ignoredRoles || [],
      ignoredUsers: logging?.ignoredUsers || [],
      ignoreEmbeds: Boolean(logging?.ignoreEmbeds),
      ignorePolls: Boolean(logging?.ignorePolls),
      ignoreSticky: Boolean(logging?.ignoreSticky),
      applyIgnoreToVoice: Boolean(logging?.applyIgnoreToVoice),
    },
    leetcode: {
      pointsEasy: Number(leetcodeConfig?.pointsEasy !== undefined ? leetcodeConfig.pointsEasy : 10),
      pointsMedium: Number(leetcodeConfig?.pointsMedium !== undefined ? leetcodeConfig.pointsMedium : 20),
      pointsHard: Number(leetcodeConfig?.pointsHard !== undefined ? leetcodeConfig.pointsHard : 30),
      shoutoutChannelId: leetcodeConfig?.shoutoutChannelId || "",
      autoPostEnabled: Boolean(leetcodeConfig?.autoPostEnabled),
      autoPostChannelId: leetcodeConfig?.autoPostChannelId || "",
      autoPostTitle: leetcodeConfig?.autoPostTitle || "",
      autoPostDescription: leetcodeConfig?.autoPostDescription || "",
      autoPostFooter: leetcodeConfig?.autoPostFooter || "",
      autoPostColor: leetcodeConfig?.autoPostColor || "",
      autoPostThumbnail: leetcodeConfig?.autoPostThumbnail || "",
      autoPostShowThumbnail: Boolean(leetcodeConfig?.autoPostShowThumbnail),
      autoPostCsvDay: Number(leetcodeConfig?.autoPostCsvDay !== undefined ? leetcodeConfig.autoPostCsvDay : 1),
      autoPostSeparator: leetcodeConfig?.autoPostSeparator || "line",
      autoPostCsvData: Array.isArray(leetcodeConfig?.autoPostCsvData) ? leetcodeConfig.autoPostCsvData : [],
    },
  };
}

async function saveGuildSettings(client, guildId, raw, session) {
  if (process.env.MOCK_DASHBOARD === "true") {
    return normalizeSettings(client, raw || {});
  }

  const guild = client.guilds.cache.get(guildId);
  if (!guild) throw new Error(`Guild ${guildId} missing from cache`);

  await hydrateGuild(guild);

  const settings = normalizeSettings(client, raw || {});

  // Normalize any eventChannels mapping to use parent forum IDs if they point to threads under a forum
  if (settings.logging?.eventChannels) {
    for (const [key, channelId] of Object.entries(settings.logging.eventChannels)) {
      if (channelId) {
        const channel = guild.channels.cache.get(channelId);
        if (channel && channel.isThread()) {
          const parent = channel.parent || await guild.channels.fetch(channel.parentId).catch(() => null);
          if (parent && parent.type === ChannelType.GuildForum) {
            settings.logging.eventChannels[key] = parent.id;
          }
        }
      }
    }
  }

  const existingAntinuke = await AntiNuke.findOne({ guildId }).lean();
  if (!canManageExtraOwners(client, guild, session)) {
    settings.antinuke.extraOwners = existingAntinuke?.extraOwners || [];
  }

  if (settings.antinuke.isEnabled) {
    settings.antinuke.logChannelId = await ensureAntinukeLogChannel(
      client,
      guild,
      settings.antinuke.logChannelId,
    );
  }

  const existingPrefix = await Prefix.findOne({ guildId }).lean();
  await Prefix.findOneAndUpdate(
    { guildId },
    {
      guildId,
      prefix: settings.prefix,
      oldPrefix: existingPrefix?.prefix || existingPrefix?.Prefix || client.prefix,
    },
    { upsert: true, new: true },
  );

  const saveResults = await Promise.allSettled([
    saveWelcome(guild, settings.welcome).catch((err) => { client.logger?.log(`[Dashboard] saveWelcome failed: ${err.message}`, "error"); throw err; }),
    // antilink: schema stores enabled (bool) + whitelist jsonb {users, roles, mode}
    AntiLink.findOneAndUpdate(
      { guildId },
      {
        guildId,
        enabled: settings.automod.antilink.isEnabled,
        whitelist: {
          users: settings.automod.antilink.whitelistUsers,
          roles: settings.automod.antilink.whitelistRoles,
          mode: "delete",
        },
      },
      { upsert: true, new: true },
    ).catch((err) => { client.logger?.log(`[Dashboard] AntiLink save failed: ${err.message}`, "error"); throw err; }),
    // antispam: schema stores enabled (bool) + threshold (int) + whitelist jsonb {users, roles, timeframe}
    AntiSpam.findOneAndUpdate(
      { guildId },
      {
        guildId,
        enabled: settings.automod.antispam.isEnabled,
        threshold: settings.automod.antispam.messageThreshold,
        whitelist: {
          users: settings.automod.antispam.whitelistUsers,
          roles: settings.automod.antispam.whitelistRoles,
          timeframe: settings.automod.antispam.timeframe,
        },
      },
      { upsert: true, new: true },
    ).catch((err) => { client.logger?.log(`[Dashboard] AntiSpam save failed: ${err.message}`, "error"); throw err; }),
    AntiNuke.findOneAndUpdate(
      { guildId },
      { guildId, ...settings.antinuke },
      { upsert: true, new: true },
    ).catch((err) => { client.logger?.log(`[Dashboard] AntiNuke save failed: ${err.message}`, "error"); throw err; }),
    // auto_role: schema stores a single `roles` jsonb column containing {humanRoles, botRoles}
    AutoRole.findOneAndUpdate(
      { guildId },
      { guildId, roles: { humanRoles: settings.autorole.humanRoles, botRoles: settings.autorole.botRoles } },
      { upsert: true, new: true },
    ).catch((err) => { client.logger?.log(`[Dashboard] AutoRole save failed: ${err.message}`, "error"); throw err; }),
    saveVoiceRole(guildId, settings.voiceRole).catch((err) => { client.logger?.log(`[Dashboard] VoiceRole save failed: ${err.message}`, "error"); throw err; }),
    // roles: schema stores a single `roles` jsonb column containing {reqrole, official, friend, guest, girl, vip}
    Roles.findOneAndUpdate(
      { guildId },
      { guildId, roles: { ...settings.roles } },
      { upsert: true, new: true },
    ).catch((err) => { client.logger?.log(`[Dashboard] Roles save failed: ${err.message}`, "error"); throw err; }),
    saveIgnoredChannels(guildId, settings.ignoreChannels).catch((err) => { client.logger?.log(`[Dashboard] IgnoredChannels save failed: ${err.message}`, "error"); throw err; }),
    saveMusic247(guildId, settings.music247).catch((err) => { client.logger?.log(`[Dashboard] Music247 save failed: ${err.message}`, "error"); throw err; }),
    savePremiumSettings(client, guild, settings.premium).catch((err) => { client.logger?.log(`[Dashboard] PremiumSettings save failed: ${err.message}`, "error"); throw err; }),
    Logging.findOneAndUpdate(
      { guildId },
      { guildId, ...settings.logging },
      { upsert: true, new: true },
    ).catch((err) => { client.logger?.log(`[Dashboard] Logging save failed: ${err.message}`, "error"); throw err; }),
    LeetcodeServerConfig.findOneAndUpdate(
      { guildId },
      {
        guildId,
        pointsEasy: settings.leetcode.pointsEasy,
        pointsMedium: settings.leetcode.pointsMedium,
        pointsHard: settings.leetcode.pointsHard,
        shoutoutChannelId: settings.leetcode.shoutoutChannelId || null,
        autoPostEnabled: settings.leetcode.autoPostEnabled,
        autoPostChannelId: settings.leetcode.autoPostChannelId || null,
        autoPostTitle: settings.leetcode.autoPostTitle || null,
        autoPostDescription: settings.leetcode.autoPostDescription || null,
        autoPostFooter: settings.leetcode.autoPostFooter || null,
        autoPostColor: settings.leetcode.autoPostColor || null,
        autoPostThumbnail: settings.leetcode.autoPostThumbnail || null,
        autoPostShowThumbnail: settings.leetcode.autoPostShowThumbnail,
        autoPostCsvDay: Number(settings.leetcode.autoPostCsvDay !== undefined ? settings.leetcode.autoPostCsvDay : 1),
        autoPostSeparator: settings.leetcode.autoPostSeparator || "line",
        autoPostCsvData: settings.leetcode.autoPostCsvData || [],
      },
      { upsert: true, new: true },
    ).catch((err) => { client.logger?.log(`[Dashboard] LeetcodeServerConfig save failed: ${err.message}`, "error"); throw err; }),
  ]);

  const failures = saveResults.filter((r) => r.status === "rejected");
  if (failures.length) {
    client.logger?.log(`[Dashboard] Save completed with ${failures.length} error(s): ${failures.map((f) => f.reason?.message).join(", ")}`, "error");
    throw new Error(`Settings save failed: ${failures[0].reason?.message || "unknown error"}`);
  }

  client.logger?.log(`[Dashboard] All settings saved successfully for guild ${guildId}`, "log");

  return loadGuildSettings(client, guild);
}

async function saveWelcome(guild, welcome) {
  const doc = await WelcomeSettings.getSettings(guild);
  doc.welcome = {
    enabled: welcome.enabled,
    channel: welcome.channel || "",
    content: welcome.content,
    autodel: welcome.autodel,
    embed: welcome.embed,
    dynamicImages: normalizeWelcomeDynamicImages(welcome.dynamicImages || {}),
  };
  doc.markModified("welcome");
  await doc.save();
}

async function saveVoiceRole(guildId, voiceRole) {
  // voice_role schema: single `mappings` jsonb column storing {roleId}
  await VoiceRole.findOneAndUpdate(
    { guildId },
    { guildId, mappings: { roleId: voiceRole.roleId || "" } },
    { upsert: true, new: true },
  );
}

async function saveIgnoredChannels(guildId, channelIds) {
  // ignore_channel schema: single `channels` jsonb array column (one row per guild)
  await IgnoreChannel.findOneAndUpdate(
    { guildId },
    { guildId, channels: channelIds.filter(Boolean) },
    { upsert: true, new: true },
  );
}

async function saveMusic247(guildId, music247) {
  if (!music247.enabled || !music247.textChannelId || !music247.voiceChannelId) {
    await AutoReconnect.deleteOne({ guildId });
    return;
  }

  await AutoReconnect.findOneAndUpdate(
    { guildId },
    {
      guildId,
      textId: music247.textChannelId,
      voiceId: music247.voiceChannelId,
    },
    { upsert: true, new: true },
  );
}

async function savePremiumSettings(client, guild, premium) {
  const nextPremium = {
    ...premium,
    branding: { enabled: false, nickname: "" },
  };

  await PremiumSettings.findOneAndUpdate(
    { guildId: guild.id },
    {
      $set: { guildId: guild.id, ...nextPremium },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  clearPremiumSettingsCache(guild.id);

  // Clear bot nickname since premium branding is disabled
  await guild.members.me?.setNickname(null).catch(() => null);
}

function normalizeSettings(client, raw) {
  return {
    prefix: stringValue(raw.prefix || client.prefix, 1, 5) || client.prefix,
    ignoreChannels: snowflakeArray(raw.ignoreChannels),
    welcome: {
      enabled: Boolean(raw.welcome?.enabled),
      channel: snowflakeValue(raw.welcome?.channel),
      content: stringValue(raw.welcome?.content || "Welcome {user} to {server_name}!", 1, 1800),
      autodel: clampNumber(raw.welcome?.autodel, 0, 120, 0),
      embed: {
        enabled: Boolean(raw.welcome?.embed?.enabled),
        title: stringValue(raw.welcome?.embed?.title, 0, 256),
        description: stringValue(raw.welcome?.embed?.description, 0, 2000),
        color: stringValue(raw.welcome?.embed?.color, 0, 20),
        thumbnail: stringValue(raw.welcome?.embed?.thumbnail, 0, 500),
        image: stringValue(raw.welcome?.embed?.image, 0, 500),
        footer: stringValue(raw.welcome?.embed?.footer, 0, 256),
      },
      dynamicImages: normalizeWelcomeDynamicImages(raw.welcome?.dynamicImages || {}),
    },
    automod: {
      antilink: {
        isEnabled: Boolean(raw.automod?.antilink?.isEnabled),
        whitelistUsers: snowflakeArray(raw.automod?.antilink?.whitelistUsers),
        whitelistRoles: snowflakeArray(raw.automod?.antilink?.whitelistRoles),
      },
      antispam: {
        isEnabled: Boolean(raw.automod?.antispam?.isEnabled),
        messageThreshold: clampNumber(raw.automod?.antispam?.messageThreshold, 2, 20, 5),
        timeframe: clampNumber(raw.automod?.antispam?.timeframe, 3, 120, 10),
        whitelistUsers: snowflakeArray(raw.automod?.antispam?.whitelistUsers),
        whitelistRoles: snowflakeArray(raw.automod?.antispam?.whitelistRoles),
      },
    },
    antinuke: {
      isEnabled: Boolean(raw.antinuke?.isEnabled),
      logChannelId: snowflakeValue(raw.antinuke?.logChannelId),
      extraOwners: snowflakeArray(raw.antinuke?.extraOwners),
      whitelistUsers: snowflakeArray(raw.antinuke?.whitelistUsers),
      whitelistRoles: snowflakeArray(raw.antinuke?.whitelistRoles),
      disabledEvents: Array.isArray(raw.antinuke?.disabledEvents) ? raw.antinuke.disabledEvents : [],
    },
    autorole: {
      humanRoles: snowflakeArray(raw.autorole?.humanRoles),
      botRoles: snowflakeArray(raw.autorole?.botRoles),
    },
    voiceRole: {
      roleId: snowflakeValue(raw.voiceRole?.roleId),
    },
    roles: {
      reqrole: snowflakeValue(raw.roles?.reqrole),
      official: snowflakeValue(raw.roles?.official),
      friend: snowflakeValue(raw.roles?.friend),
      guest: snowflakeValue(raw.roles?.guest),
      girl: snowflakeValue(raw.roles?.girl),
      vip: snowflakeValue(raw.roles?.vip),
    },
    music247: {
      enabled: Boolean(raw.music247?.enabled),
      textChannelId: snowflakeValue(raw.music247?.textChannelId),
      voiceChannelId: snowflakeValue(raw.music247?.voiceChannelId),
    },
    premium: normalizePremiumSettings(raw.premium || {}),
    logging: {
      isEnabled: Boolean(raw.logging?.isEnabled),
      eventChannels: raw.logging?.eventChannels || {},
      ignoredChannels: snowflakeArray(raw.logging?.ignoredChannels),
      ignoredRoles: snowflakeArray(raw.logging?.ignoredRoles),
      ignoredUsers: snowflakeArray(raw.logging?.ignoredUsers),
      ignoreEmbeds: Boolean(raw.logging?.ignoreEmbeds),
      ignorePolls: Boolean(raw.logging?.ignorePolls),
      ignoreSticky: Boolean(raw.logging?.ignoreSticky),
      applyIgnoreToVoice: Boolean(raw.logging?.applyIgnoreToVoice),
    },
    leetcode: {
      pointsEasy: clampNumber(raw.leetcode?.pointsEasy, 0, 1000, 10),
      pointsMedium: clampNumber(raw.leetcode?.pointsMedium, 0, 1000, 20),
      pointsHard: clampNumber(raw.leetcode?.pointsHard, 0, 1000, 30),
      shoutoutChannelId: snowflakeValue(raw.leetcode?.shoutoutChannelId),
      autoPostEnabled: Boolean(raw.leetcode?.autoPostEnabled),
      autoPostChannelId: snowflakeValue(raw.leetcode?.autoPostChannelId),
      autoPostTitle: String(raw.leetcode?.autoPostTitle || "").slice(0, 256),
      autoPostDescription: String(raw.leetcode?.autoPostDescription || "").slice(0, 2048),
      autoPostFooter: String(raw.leetcode?.autoPostFooter || "").slice(0, 256),
      autoPostColor: /^#[0-9a-fA-F]{6}$/.test(raw.leetcode?.autoPostColor) ? raw.leetcode.autoPostColor : "",
      autoPostThumbnail: String(raw.leetcode?.autoPostThumbnail || "").slice(0, 512),
      autoPostShowThumbnail: Boolean(raw.leetcode?.autoPostShowThumbnail),
      autoPostCsvDay: clampNumber(raw.leetcode?.autoPostCsvDay, 1, 999999, 1),
      autoPostSeparator: ["line", "blank", "none"].includes(raw.leetcode?.autoPostSeparator) ? raw.leetcode.autoPostSeparator : "line",
      autoPostCsvData: Array.isArray(raw.leetcode?.autoPostCsvData)
        ? raw.leetcode.autoPostCsvData
            .filter(r => r && typeof r.slug === "string" && r.slug.trim().length > 0)
            .map(r => ({
              slug: String(r.slug).trim().toLowerCase(),
              day: r.day ? String(r.day).trim().slice(0, 50) : "",
              leetcodeQno: r.leetcodeQno ? String(r.leetcodeQno).trim().slice(0, 50) : "",
              description: r.description ? String(r.description).trim().slice(0, 2048) : "",
              approach: r.approach ? String(r.approach).trim().slice(0, 1024) : "",
              advice: r.advice ? String(r.advice).trim().slice(0, 1024) : "",
              hint: r.hint ? String(r.hint).trim().slice(0, 1024) : "",
              footer: r.footer ? String(r.footer).trim().slice(0, 256) : "",
              time: r.time && /^([01]\d|2[0-3]):[0-5]\d$/.test(r.time) ? r.time : ""
            }))
            .slice(0, 500)
        : [],
    },
  };
}

function formatBot(client) {
  const avatarCandidates = userAvatarCandidates(client.user);
  return {
    id: client.user?.id || client.config.clientId,
    name: client.user?.username || client.config.app?.name || "DSC SRM RMP",
    avatar: avatarCandidates[0] || client.user?.displayAvatarURL?.({ size: 128 }) || "",
    avatarCandidates,
    prefix: client.prefix,
    guildCount: client.guilds.cache.size,
    commandCount: client.commands?.size || 0,
    slashCommandCount: client.slashCommands?.size || 0,
  };
}

async function buildPremiumPayload(guildId, userId) {
  return {
    active: false,
    guild: { active: false, id: guildId || "", type: "guild", tier: "free", status: "free", expiresAt: null, provider: "", checkoutUrl: "" },
    user: { active: false, id: userId || "", type: "user", tier: "free", status: "free", expiresAt: null, provider: "", checkoutUrl: "" },
    tier: "free",
    status: "free",
    expiresAt: null,
    provider: "",
    checkoutUrl: "",
  };
}

function normalizePremiumSettings(raw) {
  const stickyMessages = Array.isArray(raw.sticky?.messages) ? raw.sticky.messages : [];
  return {
    branding: {
      enabled: Boolean(raw.branding?.enabled),
      nickname: stringValue(raw.branding?.nickname, 0, 32),
    },
    leveling: {
      enabled: Boolean(raw.leveling?.enabled),
      chatEnabled: raw.leveling?.chatEnabled !== false,
      voiceEnabled: raw.leveling?.voiceEnabled !== false,
      announceChannelId: snowflakeValue(raw.leveling?.announceChannelId),
      levelUpMessage: stringValue(
        raw.leveling?.levelUpMessage || "{user} reached level {level}.",
        1,
        500,
      ),
      chatXpMin: clampNumber(raw.leveling?.chatXpMin, 1, 100, 8),
      chatXpMax: clampNumber(raw.leveling?.chatXpMax, 1, 200, 16),
      chatCooldownSeconds: clampNumber(raw.leveling?.chatCooldownSeconds, 5, 600, 45),
      voiceXpPerMinute: clampNumber(raw.leveling?.voiceXpPerMinute, 1, 100, 4),
    },
    vcGuard: {
      enabled: Boolean(raw.vcGuard?.enabled),
      protectedChannels: snowflakeArray(raw.vcGuard?.protectedChannels),
      bypassRoles: snowflakeArray(raw.vcGuard?.bypassRoles),
      logChannelId: snowflakeValue(raw.vcGuard?.logChannelId),
      action: "disconnect",
      message: stringValue(
        raw.vcGuard?.message || "You are not allowed to join this protected voice channel.",
        1,
        500,
      ),
    },
    sticky: {
      enabled: Boolean(raw.sticky?.enabled),
      messages: stickyMessages
        .map((item) => ({
          channelId: snowflakeValue(item.channelId),
          content: stringValue(item.content, 0, 1800),
          lastMessageId: snowflakeValue(item.lastMessageId),
          cooldownSeconds: clampNumber(item.cooldownSeconds, 5, 600, 20),
        }))
        .filter((item) => item.channelId || item.content)
        .slice(0, 10),
    },
  };
}

function formatUser(user) {
  const avatarCandidates = userAvatarCandidates(user);
  return {
    id: user?.id,
    username: user?.username,
    globalName: user?.global_name || user?.username,
    avatar: avatarCandidates[0] || "",
    avatarCandidates,
  };
}

function formatGuild(guild) {
  const iconCandidates = guildIconCandidates(guild);
  return {
    id: guild.id,
    name: guild.name,
    icon: iconCandidates[0] || "",
    iconCandidates,
    memberCount: guild.memberCount || 0,
    ownerId: guild.ownerId,
  };
}

function formatGuildListItem(client, guild, options = {}) {
  const iconCandidates = guildIconCandidates(guild);
  const installed = options.installed !== false;
  return {
    id: guild.id,
    name: guild.name,
    icon: iconCandidates[0] || "",
    iconCandidates,
    owner: Boolean(options.owner),
    installed,
    action: installed ? "manage" : "invite",
    inviteUrl: installed ? "" : inviteUrlForGuild(options.inviteBaseUrl, guild.id),
    memberCount: guild.memberCount || 0,
  };
}

function getBotInviteUrl(client) {
  const clientId = client.config?.clientId || client.user?.id;
  if (!clientId) return "";

  const url = new URL("https://discord.com/oauth2/authorize");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("permissions", client.config?.invitePermissions || "824671333721");
  url.searchParams.set("scope", "bot applications.commands");
  return url.toString();
}

function inviteUrlForGuild(baseUrl, guildId) {
  if (!baseUrl || !guildId) return "";
  const url = new URL(baseUrl);
  url.searchParams.set("guild_id", guildId);
  url.searchParams.set("disable_guild_select", "true");
  return url.toString();
}

async function formatViewer(client, guild, session) {
  const id = session?.user?.id || "";
  const member = id ? await guild.members.fetch(id).catch(() => null) : null;
  const user = member?.user || session?.user || {};
  const avatarCandidates = memberAvatarCandidates(guild, member, session?.user);
  return {
    id,
    username: user.username || session?.user?.username || "",
    globalName: user.globalName || user.global_name || member?.displayName || session?.user?.username || "",
    avatar: avatarCandidates[0] || "",
    avatarCandidates,
    isGuildOwner: id === guild.ownerId,
    isBotOwner: isBotOwner(client, id),
    canManageExtraOwners: canManageExtraOwners(client, guild, session),
  };
}

function canManageExtraOwners(client, guild, session) {
  const id = session?.user?.id;
  return Boolean(id && (id === guild.ownerId || isBotOwner(client, id)));
}

async function ensureAntinukeLogChannel(client, guild, channelId) {
  const existing = channelId ? guild.channels.cache.get(channelId) : null;
  if (existing?.isTextBased?.()) return existing.id;

  const name = client.config.app?.antinukeLogChannelName || "bot-logs";
  const reusable = guild.channels.cache.find(
    (channel) => channel.type === ChannelType.GuildText && channel.name === name,
  );
  if (reusable?.isTextBased?.()) return reusable.id;

  const botId = guild.members.me?.id || client.user?.id;
  try {
    const channel = await guild.channels.create({
      name,
      type: ChannelType.GuildText,
      permissionOverwrites: [
        {
          id: guild.id,
          deny: [PermissionsBitField.Flags.ViewChannel],
        },
        {
          id: guild.ownerId,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages,
            PermissionsBitField.Flags.ReadMessageHistory,
          ],
        },
        botId && {
          id: botId,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages,
            PermissionsBitField.Flags.ReadMessageHistory,
            PermissionsBitField.Flags.ManageChannels,
          ],
        },
      ].filter(Boolean),
      reason: "Logging channel for Antinuke",
    });
    return channel.id;
  } catch (error) {
    client.logger?.log(`[Dashboard] Could not create antinuke log channel in ${guild.id}: ${error.message}`, "warn");
    return "";
  }
}

function formatChannels(guild) {
  return guild.channels.cache
    .filter((channel) => [
      ChannelType.GuildText,
      ChannelType.GuildAnnouncement,
      ChannelType.GuildVoice,
      ChannelType.GuildStageVoice,
      ChannelType.GuildForum,
      ChannelType.PublicThread,
      ChannelType.PrivateThread,
      ChannelType.AnnouncementThread,
    ].includes(channel.type))
    .map((channel) => ({
      id: channel.id,
      name: channel.name,
      type: channel.type,
      parentId: channel.parentId || "",
      position: channel.rawPosition || channel.position || 0,
      label: `${isVoiceChannel(channel.type) ? "Voice" : "Text"} / ${channel.name}`,
    }))
    .sort((a, b) => a.position - b.position || a.name.localeCompare(b.name));
}

function formatRoles(guild) {
  return guild.roles.cache
    .filter((role) => role.id !== guild.id && !role.managed)
    .map((role) => ({
      id: role.id,
      name: role.name,
      color: role.hexColor === "#000000" ? "#99a1ad" : role.hexColor,
      position: role.position,
    }))
    .sort((a, b) => b.position - a.position || a.name.localeCompare(b.name));
}

function commandStats(client) {
  const categories = {};
  for (const command of client.commands?.values?.() || []) {
    const category = command.category || "Other";
    categories[category] = (categories[category] || 0) + 1;
  }
  return {
    prefix: client.commands?.size || 0,
    slash: client.slashCommands?.size || 0,
    categories,
  };
}

function avatarUrl(user) {
  return userAvatarCandidates(user)[0] || "";
}

function memberAvatarCandidates(guild, member, fallbackUser) {
  const candidates = [];
  if (member?.avatar && member?.id && guild?.id) {
    candidates.push(...cdnImageCandidates(
      `https://cdn.discordapp.com/guilds/${guild.id}/users/${member.id}/avatars/${member.avatar}`,
      member.avatar,
    ));
  }
  candidates.push(...userAvatarCandidates(member?.user || fallbackUser));
  return uniqueStrings(candidates);
}

function userAvatarCandidates(user) {
  if (!user?.id || !user?.avatar) return [];
  return cdnImageCandidates(`https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}`, user.avatar);
}

function guildIconCandidates(guild) {
  if (!guild?.id || !guild?.icon) return [];
  return cdnImageCandidates(`https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}`, guild.icon);
}

function cdnImageCandidates(base, hash) {
  const animated = String(hash || "").startsWith("a_");
  const extensions = animated ? ["gif", "webp", "png"] : ["webp", "png", "jpg"];
  return extensions.map((extension) => `${base}.${extension}?size=128`);
}

function uniqueStrings(values) {
  return [...new Set(values.filter(Boolean))];
}

function isVoiceChannel(type) {
  return type === ChannelType.GuildVoice || type === ChannelType.GuildStageVoice;
}

function stringValue(value, min, max) {
  const text = String(value || "").trim();
  if (text.length < min) return "";
  return text.slice(0, max);
}

function snowflakeValue(value) {
  const text = String(value || "").trim();
  return SNOWFLAKE.test(text) ? text : "";
}

function snowflakeArray(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map(snowflakeValue).filter(Boolean))].slice(0, 50);
}

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, Math.round(number)));
}

function readCookie(req, name) {
  const header = req.headers.cookie || "";
  for (const part of header.split(";")) {
    const [key, ...value] = part.trim().split("=");
    if (key === name) return decodeURIComponent(value.join("="));
  }
  return "";
}

function buildCookie(client, sessionId, req) {
  const config = client.config.dashboard || {};
  const isSecure = (req && (req.headers["x-forwarded-proto"] === "https" || req.socket.encrypted)) || config.publicUrl?.startsWith("https://");
  const secure = isSecure ? "; Secure" : "";
  return `${config.cookieName}=${encodeURIComponent(sessionId)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${Math.floor((config.sessionTtlMs || 604800000) / 1000)}${secure}`;
}

function clearCookie(client) {
  const cookieName = client.config.dashboard?.cookieName || "dsc_dashboard";
  return `${cookieName}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0`;
}

function cleanupStores(ttlMs = 604800000) {
  const now = Date.now();
  // Clean in-memory session cache entries
  for (const [id, cached] of sessionCache) {
    if (now - cached.cachedAt > SESSION_CACHE_TTL) sessionCache.delete(id);
  }
  // Clean expired oauth states
  for (const [state, createdAt] of oauthStates) {
    if (now - createdAt > 1000 * 60 * 10) oauthStates.delete(state);
  }
  // Clean expired sessions from DB (fire and forget)
  try {
    const db = getDb();
    db.delete(dashboardSessions)
      .where(lt(dashboardSessions.expiresAt, new Date()))
      .catch(() => null);
  } catch {}
}

function redirect(res, location) {
  res.writeHead(302, { Location: location });
  res.end();
}

async function readJsonBody(req) {
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) throw new Error("Request body too large");
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new Error("Invalid JSON body");
  }
}

function serveStatic(res, filePath) {
  const resolved = path.resolve(filePath);
  const publicRoot = path.resolve(PUBLIC_DIR);
  if (!resolved.startsWith(publicRoot)) {
    return sendText(res, 403, "Forbidden");
  }

  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) {
    return sendText(res, 404, "Not found");
  }

  const ext = path.extname(resolved).toLowerCase();
  const contentType = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".webp": "image/webp",
  }[ext] || "application/octet-stream";

  res.writeHead(200, {
    "Content-Type": contentType,
    "Cache-Control": [".html", ".css", ".js"].includes(ext) ? "no-store" : "public, max-age=3600",
  });
  fs.createReadStream(resolved).pipe(res);
}

function sendJson(res, status, payload) {
  if (res.headersSent) return;
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(payload));
}

function sendText(res, status, text) {
  if (res.headersSent) return;
  res.writeHead(status, { "Content-Type": "text/plain; charset=utf-8" });
  res.end(text);
}

module.exports = startDashboard;
