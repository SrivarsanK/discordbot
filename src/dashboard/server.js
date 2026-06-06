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
const Premium = require("../schema/premium");
const PremiumSettings = require("../schema/premiumSettings");
const {
  clearPremiumSettingsCache,
  getActivePremium,
} = require("../utils/premiumFeatures");
const { normalizeWelcomeDynamicImages } = require("../utils/welcomeImage");

const PUBLIC_DIR = path.join(__dirname, "public");
const MANAGE_GUILD = 0x20n;
const ADMINISTRATOR = 0x8n;
const MAX_BODY_BYTES = 10 * 1024 * 1024;
const SNOWFLAKE = /^\d{16,22}$/;

const sessions = new Map();
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
    return redirect(res, "/?auth=failed");
  }

  oauthStates.delete(state);

  try {
    const token = await exchangeCode(client, code);
    const [user, guilds] = await Promise.all([
      discordFetch(client, "/users/@me", token.access_token),
      discordFetch(client, "/users/@me/guilds", token.access_token),
    ]);

    const sessionId = crypto.randomBytes(32).toString("hex");
    sessions.set(sessionId, {
      user,
      guilds: Array.isArray(guilds) ? guilds : [],
      accessToken: token.access_token,
      refreshToken: token.refresh_token,
      expiresAt: Date.now() + Number(token.expires_in || 604800) * 1000,
      createdAt: Date.now(),
      touchedAt: Date.now(),
    });

    res.writeHead(302, {
      Location: "/?choose=server",
      "Set-Cookie": buildCookie(client, sessionId),
    });
    res.end();
  } catch (error) {
    client.logger?.log(`[Dashboard] OAuth failed: ${error.message}`, "warn");
    redirect(res, "/?auth=failed");
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
  const session = getSession(client, req);
  if (!session) return sendJson(res, 401, { error: "Not logged in" });

  if (req.method === "GET" && url.pathname === "/api/me") {
    return sendJson(res, 200, {
      user: formatUser(session.user),
      bot: formatBot(client),
      guilds: getManageableGuilds(client, session),
    });
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
  const sessionId = readCookie(req, client.config.dashboard?.cookieName || "dsc_dashboard");
  if (sessionId) sessions.delete(sessionId);
  res.writeHead(204, {
    "Set-Cookie": clearCookie(client),
  });
  res.end();
}

function getSession(client, req) {
  const cookieName = client.config.dashboard?.cookieName || "dsc_dashboard";
  const sessionId = readCookie(req, cookieName);
  client.logger?.log(`[Dashboard] getSession - cookieName: ${cookieName}, sessionId: ${sessionId ? 'present' : 'missing'}`, "log");
  if (!sessionId) return null;

  const session = sessions.get(sessionId);
  client.logger?.log(`[Dashboard] getSession - session found in memory: ${session ? 'yes' : 'no'}`, "log");
  if (!session) return null;

  const ttl = client.config.dashboard?.sessionTtlMs || 604800000;
  if (Date.now() - session.touchedAt > ttl || Date.now() > session.expiresAt + ttl) {
    client.logger?.log(`[Dashboard] getSession - session expired!`, "log");
    sessions.delete(sessionId);
    return null;
  }

  session.touchedAt = Date.now();
  return session;
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
  if (!premium.guild?.active) {
    settings.premium.branding = { enabled: false, nickname: "" };
  }
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
  ] = await Promise.all([
    Prefix.findOne({ Guild: guildId }).lean(),
    AntiNuke.findOne({ guildId }).lean(),
    AntiLink.findOne({ guildId }).lean(),
    AntiSpam.findOne({ guildId }).lean(),
    AutoRole.findOne({ guildId }).lean(),
    VoiceRole.findOne({ guildId }).lean(),
    Roles.findOne({ guildId }).lean(),
    IgnoreChannel.find({ guildId }).lean(),
    AutoReconnect.findOne({ Guild: guildId }).lean(),
    WelcomeSettings.getSettings(guild),
    PremiumSettings.findOneAndUpdate(
      { guildId },
      { $setOnInsert: { guildId } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ).lean(),
  ]);

  return {
    prefix: prefix?.Prefix || client.prefix,
    ignoreChannels: ignored.map((item) => item.channelId).filter(Boolean),
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
        isEnabled: Boolean(antilink?.isEnabled),
        whitelistUsers: antilink?.whitelistUsers || [],
        whitelistRoles: antilink?.whitelistRoles || [],
      },
      antispam: {
        isEnabled: Boolean(antispam?.isEnabled),
        messageThreshold: Number(antispam?.messageThreshold || 5),
        timeframe: Number(antispam?.timeframe || 10),
        whitelistUsers: antispam?.whitelistUsers || [],
        whitelistRoles: antispam?.whitelistRoles || [],
      },
    },
    antinuke: {
      isEnabled: Boolean(antinuke?.isEnabled),
      logChannelId: antinuke?.logChannelId || "",
      extraOwners: antinuke?.extraOwners || [],
      whitelistUsers: antinuke?.whitelistUsers || [],
      whitelistRoles: antinuke?.whitelistRoles || [],
    },
    autorole: {
      humanRoles: autorole?.humanRoles || [],
      botRoles: autorole?.botRoles || [],
    },
    voiceRole: {
      roleId: voiceRole?.roleId || "",
    },
    roles: {
      reqrole: roles?.reqrole || "",
      official: roles?.official || "",
      friend: roles?.friend || "",
      guest: roles?.guest || "",
      girl: roles?.girl || "",
      vip: roles?.vip || "",
    },
    music247: {
      enabled: Boolean(auto247),
      textChannelId: auto247?.TextId || "",
      voiceChannelId: auto247?.VoiceId || "",
    },
    premium: normalizePremiumSettings(premiumSettings || {}),
  };
}

async function saveGuildSettings(client, guildId, raw, session) {
  const guild = client.guilds.cache.get(guildId);
  if (!guild) throw new Error(`Guild ${guildId} missing from cache`);

  await hydrateGuild(guild);

  const settings = normalizeSettings(client, raw || {});
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

  const existingPrefix = await Prefix.findOne({ Guild: guildId });
  await Prefix.findOneAndUpdate(
    { Guild: guildId },
    {
      Guild: guildId,
      Prefix: settings.prefix,
      oldPrefix: existingPrefix?.Prefix || client.prefix,
    },
    { upsert: true, new: true },
  );

  await Promise.all([
    saveWelcome(guild, settings.welcome),
    AntiLink.findOneAndUpdate(
      { guildId },
      { guildId, ...settings.automod.antilink },
      { upsert: true, new: true },
    ),
    AntiSpam.findOneAndUpdate(
      { guildId },
      { guildId, ...settings.automod.antispam },
      { upsert: true, new: true },
    ),
    AntiNuke.findOneAndUpdate(
      { guildId },
      { guildId, ...settings.antinuke },
      { upsert: true, new: true },
    ),
    AutoRole.findOneAndUpdate(
      { guildId },
      { guildId, ...settings.autorole },
      { upsert: true, new: true },
    ),
    saveVoiceRole(guildId, settings.voiceRole),
    Roles.findOneAndUpdate(
      { guildId },
      { guildId, ...settings.roles },
      { upsert: true, new: true },
    ),
    saveIgnoredChannels(guildId, settings.ignoreChannels),
    saveMusic247(guildId, settings.music247),
    savePremiumSettings(client, guild, settings.premium),
  ]);

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
  if (!voiceRole.roleId) {
    await VoiceRole.deleteOne({ guildId });
    return;
  }

  await VoiceRole.findOneAndUpdate(
    { guildId },
    { guildId, roleId: voiceRole.roleId },
    { upsert: true, new: true },
  );
}

async function saveIgnoredChannels(guildId, channelIds) {
  await IgnoreChannel.deleteMany({ guildId });
  if (!channelIds.length) return;

  await IgnoreChannel.insertMany(
    channelIds.map((channelId) => ({ guildId, channelId })),
    { ordered: false },
  ).catch(() => null);
}

async function saveMusic247(guildId, music247) {
  if (!music247.enabled || !music247.textChannelId || !music247.voiceChannelId) {
    await AutoReconnect.deleteOne({ Guild: guildId });
    return;
  }

  await AutoReconnect.findOneAndUpdate(
    { Guild: guildId },
    {
      Guild: guildId,
      TextId: music247.textChannelId,
      VoiceId: music247.voiceChannelId,
    },
    { upsert: true, new: true },
  );
}

async function savePremiumSettings(client, guild, premium) {
  const active = await getActivePremium(guild.id);
  const nextPremium = {
    ...premium,
    branding: active
      ? premium.branding
      : { enabled: false, nickname: "" },
  };

  await PremiumSettings.findOneAndUpdate(
    { guildId: guild.id },
    {
      $set: { guildId: guild.id, ...nextPremium },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  clearPremiumSettingsCache(guild.id);

  if (nextPremium.branding) {
    const nickname = nextPremium.branding.enabled ? nextPremium.branding.nickname : "";
    await guild.members.me?.setNickname(nickname || null).catch(() => null);
  }
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
  const [guildEntry, userEntry] = await Promise.all([
    Premium.findOne({ id: guildId, type: "guild" }).lean(),
    userId ? Premium.findOne({ id: userId, type: "user" }).lean() : null,
  ]);
  const guild = formatPremiumEntry(guildEntry, guildId, "guild");
  const user = formatPremiumEntry(userEntry, userId, "user");

  return {
    active: guild.active || user.active,
    guild,
    user,
    tier: guild.tier,
    status: guild.status,
    expiresAt: guild.expiresAt,
    provider: guild.provider,
    checkoutUrl: guild.checkoutUrl,
  };
}

function formatPremiumEntry(entry, id, type) {
  const active = Boolean(
    entry &&
      entry.status !== "canceled" &&
      (!entry.expiresAt || new Date(entry.expiresAt) > new Date()),
  );
  return {
    id: id || "",
    type,
    active,
    tier: entry?.tier || "free",
    status: entry?.status || (active ? "active" : "free"),
    expiresAt: entry?.expiresAt || null,
    provider: entry?.payment?.provider || "",
    checkoutUrl: entry?.payment?.checkoutUrl || "",
    addedBy: entry?.addedBy || "",
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

function buildCookie(client, sessionId) {
  const config = client.config.dashboard || {};
  const secure = config.publicUrl?.startsWith("https://") ? "; Secure" : "";
  return `${config.cookieName}=${encodeURIComponent(sessionId)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${Math.floor((config.sessionTtlMs || 604800000) / 1000)}${secure}`;
}

function clearCookie(client) {
  const cookieName = client.config.dashboard?.cookieName || "dsc_dashboard";
  return `${cookieName}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0`;
}

function cleanupStores(ttlMs = 604800000) {
  const now = Date.now();
  for (const [id, session] of sessions) {
    if (now - session.touchedAt > ttlMs || now > session.expiresAt + ttlMs) sessions.delete(id);
  }
  for (const [state, createdAt] of oauthStates) {
    if (now - createdAt > 1000 * 60 * 10) oauthStates.delete(state);
  }
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
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
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
