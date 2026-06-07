const app = document.getElementById("app");
const MAX_LOCAL_IMAGE_BYTES = 3 * 1024 * 1024;
const MAX_IMAGE_SOURCE_LENGTH = 8 * 1024 * 1024;

const pages = [
  { id: "overview", label: "Home", icon: "home", group: "Main" },
  { id: "general", label: "General Settings", icon: "settings", group: "Main" },
  { id: "music", label: "Music", icon: "music", group: "Modules", status: "music247.enabled" },
  { id: "leveling", label: "Leveling", icon: "award", group: "Modules", status: "premium.leveling.enabled" },
  { id: "vcguard", label: "VC Guard", icon: "shield", group: "Modules", status: "premium.vcGuard.enabled" },
  { id: "sticky", label: "Sticky Messages", icon: "pin", group: "Modules", status: "premium.sticky.enabled" },
  { id: "automod", label: "Auto Moderation", icon: "gavel", group: "Modules", status: "automod.any" },
  { id: "antinuke", label: "Anti Nuke", icon: "bomb", group: "Modules", status: "antinuke.isEnabled" },
  { id: "welcome", label: "Welcome Messages", icon: "user-plus", group: "Modules", status: "welcome.enabled" },
  { id: "roles", label: "Roles", icon: "users", group: "Modules", status: "roles.any" },
  { id: "logging", label: "Logging", icon: "file-text", group: "Modules", status: "antinuke.isEnabled" },
];

const antinukeProtections = [
  "Anti ban",
  "Anti kick",
  "Anti unban",
  "Anti role create/delete/update",
  "Anti channel create/delete/update",
  "Anti webhook create/update/delete",
  "Anti sticker create/delete/update",
  "Anti emoji create/update/delete",
  "Anti auto-mod rule create/update/delete",
  "Anti everyone/here",
  "Anti server update",
  "Anti bot add",
  "Anti vanity steal",
];

const state = {
  me: null,
  guilds: [],
  guildId: localStorage.getItem("dsc:guild") || "",
  data: null,
  draft: null,
  page: localStorage.getItem("dsc:page") || "overview",
  welcomeTab: localStorage.getItem("dsc:welcomeTab") || "messages",
  dynamicImageIndex: Number(localStorage.getItem("dsc:dynamicImageIndex") || 0),
  selectedLayer: localStorage.getItem("dsc:selectedLayer") || "avatar",
  dirty: false,
  saving: false,
  refreshing: false,
};

let liveRefreshStarted = false;

init();

async function init() {
  try {
    const params = new URLSearchParams(location.search);
    const forceServerChooser = params.get("choose") === "server";
    if (forceServerChooser) {
      history.replaceState(null, "", location.pathname);
      state.guildId = "";
      localStorage.removeItem("dsc:guild");
    }

    const payload = await api("/api/me");
    state.me = payload;
    state.guilds = payload.guilds || [];

    if (!state.guilds.length) {
      renderNoGuilds();
      return;
    }

    if (forceServerChooser || !state.guildId || !state.guilds.some((guild) => guild.id === state.guildId && guild.installed)) {
      state.guildId = "";
      localStorage.removeItem("dsc:guild");
      renderGuildChooser();
      return;
    }

    await loadGuild(state.guildId);
  } catch (error) {
    renderLogin();
  }
}

function renderGuildChooser() {
  const installedGuilds = state.guilds.filter((guild) => guild.installed);
  const inviteGuilds = state.guilds.filter((guild) => !guild.installed);
  app.innerHTML = `
    <div class="app-shell">
      ${renderTopbar()}
      <main class="content">
        <section class="page wide server-chooser-page">
          <div class="server-hero">
            <div class="page-title">
              <span class="title-icon"><i data-lucide="server"></i></span>
              <div>
                <h1>Select Server</h1>
                <p>Pick a server to manage, or invite DSC SRM RMP where it is missing.</p>
              </div>
            </div>
            <div class="server-tools">
              <input class="input server-search" type="search" data-server-search placeholder="Search servers">
              <div class="server-filter-row" role="group" aria-label="Server filter">
                <button class="btn small primary" type="button" data-server-filter="all">All</button>
                <button class="btn small ghost" type="button" data-server-filter="ready">Manage</button>
                <button class="btn small ghost" type="button" data-server-filter="invite">Invite</button>
              </div>
            </div>
          </div>

          <div class="server-summary">
            ${miniStat("Ready to manage", installedGuilds.length)}
            ${miniStat("Need invite", inviteGuilds.length)}
            ${miniStat("Total servers", state.guilds.length)}
          </div>

          <div class="server-section-head">
            <div>
              <h2>Servers</h2>
              <p>Manage opens the dashboard. Invite opens Discord's bot invite for that server.</p>
            </div>
          </div>
          <div class="server-grid">
            ${[...installedGuilds, ...inviteGuilds].map(guildChoiceCard).join("")}
          </div>
          <div class="server-empty" data-server-empty hidden>No servers match that search.</div>
        </section>
      </main>
    </div>
  `;
  bindGlobalActions();
  if (window.lucide) window.lucide.createIcons();
}

function guildChoiceCard(guild) {
  const sources = avatarSources(guild.iconCandidates, guild.icon);
  const action = guild.installed ? "Manage" : "Invite";
  const status = guild.installed ? "ready" : "invite";
  const guildName = String(guild.name || "Unnamed server");
  return `
    <article class="server-card ${status}" data-server-card data-server-status="${status}" data-server-name="${escapeAttr(guildName.toLowerCase())}">
      ${avatarImage(sources, guildName, "guild-icon server-icon")}
      <div class="server-card-main">
        <h3>${escapeHtml(guildName)}</h3>
        <p>${guild.installed ? "Dashboard is ready for this server." : "Invite DSC SRM RMP before managing this server."}</p>
      </div>
      <span class="server-status ${status}">${guild.installed ? "Ready" : "Missing"}</span>
      <button class="btn ${guild.installed ? "primary" : "ghost"}" type="button" data-guild-option="${guild.id}">
        ${action}
      </button>
    </article>
  `;
}

async function loadGuild(guildId) {
  state.guildId = guildId;
  localStorage.setItem("dsc:guild", guildId);
  state.dirty = false;
  state.data = null;
  state.draft = null;
  renderShell(true);

  try {
    state.data = await api(`/api/guilds/${guildId}`);
    state.draft = clone(state.data.settings);
    ensureDraftShape();
    renderShell();
    startLiveRefresh();
  } catch (error) {
    toast(error.message || "Could not load server", "bad");
    renderShell();
  }
}

function renderLogin() {
  const failed = new URLSearchParams(location.search).get("auth") === "failed";
  app.innerHTML = `
    <main class="login">
      <section class="login-card">
        <div class="brand-mark">A</div>
        <h1>DSC SRM RMP Dashboard</h1>
        <p>Manage your bot settings with Discord sign in.</p>
        ${failed ? `<p class="status-pill warn">Discord login failed</p>` : ""}
        <div class="login-actions">
          <a class="btn primary" href="/login">Login with Discord</a>
          <button class="btn ghost" type="button" data-retry>Refresh</button>
        </div>
      </section>
    </main>
  `;
  app.querySelector("[data-retry]")?.addEventListener("click", () => location.reload());
}

function renderNoGuilds() {
  app.innerHTML = `
    <div class="app-shell">
      ${renderTopbar()}
      <main class="content">
        <section class="empty">
          <h1>No manageable servers</h1>
          <p class="muted">Log in with an account that owns a server or has Manage Server permission.</p>
          <div class="login-actions">
            <button class="btn" type="button" data-logout>Logout</button>
          </div>
        </section>
      </main>
    </div>
  `;
  bindGlobalActions();
  if (window.lucide) window.lucide.createIcons();
}

function renderShell(loading = false) {
  if (state.draft) ensureDraftShape();
  if (!pages.some((page) => page.id === state.page)) state.page = "overview";

  app.innerHTML = `
    <div class="app-shell">
      ${renderTopbar()}
      <div class="layout">
        ${renderSidebar()}
        <main class="content">
          ${loading ? renderLoadingPage() : renderPage()}
        </main>
      </div>
      ${renderSavebar()}
    </div>
  `;
  bindGlobalActions();
  bindSidebar();
  bindFields();
  updateSavebar();
  if (window.lucide) window.lucide.createIcons();
}

function renderTopbar() {
  const guild = state.guilds.find((item) => item.id === state.guildId);
  const user = state.me?.user || {};
  const viewer = state.data?.viewer || {};
  const bot = state.data?.bot || state.me?.bot || {};
  const guildName = guild?.name || "Select server";
  const userName = viewer.globalName || user.globalName || viewer.username || user.username || "User";
  const userAvatar = avatarSources(viewer.avatarCandidates, viewer.avatar, user.avatarCandidates, user.avatar);
  const botAvatar = avatarSources(bot.avatarCandidates, bot.avatar);
  const botName = bot.name || "DSC SRM RMP";
  return `
    <header class="topbar">
      <div class="top-left">
        <div class="brand">${avatarImage(botAvatar, botName, "brand-mark brand-avatar")}<span>${escapeHtml(botName)}</span></div>
        <div class="guild-picker" data-guild-picker>
          <button class="guild-button" type="button" data-guild-menu-toggle aria-haspopup="listbox" aria-expanded="false">
            ${avatarImage(avatarSources(guild?.iconCandidates, guild?.icon), guildName, "guild-icon")}
            <span class="picker-text">${escapeHtml(guildName)}</span>
            <span class="chevron" aria-hidden="true"></span>
          </button>
          <div class="guild-menu" data-guild-menu role="listbox" aria-label="Server selector">
            <div class="menu-title">Servers</div>
            ${state.guilds.map((item) => `
              <button class="guild-option ${item.id === state.guildId ? "active" : ""}" type="button" data-guild-option="${item.id}" role="option" aria-selected="${item.id === state.guildId}">
                ${avatarImage(avatarSources(item.iconCandidates, item.icon), item.name, "guild-icon")}
                <span>${escapeHtml(item.name)}</span>
                <small class="guild-action ${item.installed ? "manage" : "invite"}">${item.installed ? "Manage" : "Invite"}</small>
              </button>
            `).join("") || `<div class="menu-empty">No servers found</div>`}
          </div>
        </div>
      </div>
      <div class="user-pill">
        <div class="user-identity">
          ${avatarImage(userAvatar, userName, "avatar")}
          <strong>${escapeHtml(userName)}</strong>
        </div>
        <button class="logout-button" type="button" data-logout>Logout</button>
      </div>
    </header>
  `;
}

function renderSidebar() {
  const grouped = groupBy(pages, "group");
  return `
    <aside class="sidebar">
      <div class="sidebar-actions">
        <button class="btn small ${state.page === "overview" ? "primary" : "ghost"}" type="button" data-nav="overview"><i data-lucide="home"></i> Home</button>
        <button class="btn small ghost" type="button" data-refresh><i data-lucide="refresh-cw"></i> Refresh</button>
      </div>
      ${Object.entries(grouped).map(([group, items]) => `
        <nav class="nav-group">
          <div class="nav-title">${escapeHtml(group)}</div>
          ${items.map(renderNavItem).join("")}
        </nav>
      `).join("")}
    </aside>
  `;
}

function renderNavItem(page) {
  const statusPath = page.status;
  const hasToggle = statusPath && statusPath !== "roles.any";
  const on = statusPath ? statusFor(statusPath) : false;
  return `
    <button class="nav-item ${state.page === page.id ? "active" : ""}" type="button" data-nav="${page.id}">
      <span class="nav-label"><span class="nav-icon"><i data-lucide="${page.icon}"></i></span>${escapeHtml(page.label)}</span>
      ${hasToggle ? `
        <span class="small-toggle ${on ? "checked" : ""}" data-sidebar-toggle="${statusPath}" role="checkbox" aria-checked="${on}" tabindex="0">
          <span></span>
        </span>
      ` : page.status ? `
        <span class="nav-dot ${on ? "on" : ""}"></span>
      ` : ""}
    </button>
  `;
}

function renderLoadingPage() {
  return `
    <section class="page">
      ${pageHead("refresh-cw", "Loading", "Fetching server settings...")}
    </section>
  `;
}

function renderPage() {
  if (!state.data || !state.draft) {
    return `
      <section class="page">
        <div class="empty">
          <h1>Server unavailable</h1>
          <p class="muted">Select another server or refresh the dashboard.</p>
        </div>
      </section>
    `;
  }

  switch (state.page) {
    case "general":
      return renderGeneral();
    case "leveling":
      return renderLeveling();
    case "vcguard":
      return renderVcGuard();
    case "sticky":
      return renderSticky();
    case "music":
      return renderMusic();
    case "automod":
      return renderAutomod();
    case "antinuke":
      return renderAntinuke();
    case "welcome":
      return renderWelcome();
    case "roles":
      return renderRoles();
    case "logging":
      return renderLogging();
    default:
      return renderOverview();
  }
}

function renderOverview() {
  const guild = state.data.guild;
  const bot = state.data.bot;
  const settings = state.draft;
  return `
    <section class="page wide">
      ${pageHead("layout-dashboard", `Welcome <span class="accent">${escapeHtml(guild.name)}</span>,`, `${bot.commandCount} prefix commands, ${bot.slashCommandCount} slash commands, ${guild.memberCount} members`)}
      <div class="mini-stat-grid">
        ${miniStat("Prefix", settings.prefix)}
        ${miniStat("Automod", statusFor("automod.any") ? "On" : "Off")}
        ${miniStat("Antinuke", settings.antinuke.isEnabled ? "On" : "Off")}
        ${miniStat("Welcome", settings.welcome.enabled ? "On" : "Off")}
      </div>
      <div class="grid">
        ${shortcutCard("Custom prefix", "General Settings", "Update how members call DSC SRM RMP commands.", "general", "Open settings")}
        ${shortcutCard("Auto moderation", "Auto Moderation", "Anti link and anti spam controls for this server.", "automod", "Configure")}
        ${shortcutCard("Welcome messages", "Welcome Messages", "Channel, content, embed fields, and preview.", "welcome", "Edit message")}
        ${shortcutCard("Music 24/7", "Music", "Keep the player connected to a voice channel.", "music", "Manage music")}
        ${shortcutCard("Leveling", "XP", "Free chat and voice XP for active members.", "leveling", "Configure XP")}
        ${shortcutCard("VC guard", "VC", "Protect selected voice channels with bypass roles.", "vcguard", "Configure guard")}
        ${shortcutCard("Sticky messages", "Sticky", "Keep an important message at the bottom of a channel.", "sticky", "Configure sticky")}
        ${shortcutCard("Anti nuke", "Anti Nuke", "Extra owners and whitelisted roles.", "antinuke", "Secure server")}
        ${shortcutCard("Audit logging", "Logging", "Configure the logging channel for security and bot events.", "logging", "Configure logging")}
        ${shortcutCard("Role tools", "Roles", "Autorole, voice role, and shortcut roles.", "roles", "Manage roles")}
      </div>
    </section>
  `;
}

function renderGeneral() {
  return `
    <section class="page">
      ${pageHead("settings", "General Settings", "Prefix and command ignore settings.")}
      <div class="panel">
        <div class="panel-head">
          <div class="panel-title">
            <span class="mini-icon"><i data-lucide="key"></i></span>
            <div><h2>Command access</h2><p>Server-specific prefix and command ignore list.</p></div>
          </div>
        </div>
        <div class="setting-grid">
          ${inputField("Prefix", "prefix", "text", { max: 5 })}
          ${multiSelectField("Ignored channels", "ignoreChannels", textChannels())}
        </div>
      </div>
    </section>
  `;
}

function renderLoggingTabs() {
  const items = [
    ["channels", "Log Channels"],
    ["ignores", "Ignore Settings"]
  ];
  return `
    <div class="welcome-tabs" role="tablist" aria-label="Logging tabs">
      ${items.map(([id, label]) => `
        <button class="${state.loggingTab === id ? "active" : ""}" type="button" data-logging-tab="${id}" role="tab" aria-selected="${state.loggingTab === id}">
          ${escapeHtml(label)}
        </button>
      `).join("")}
    </div>
  `;
}

function renderLogging() {
  const enabled = Boolean(state.draft.logging.isEnabled);
  state.loggingTab ||= "channels";

  const categories = [
    {
      id: "messages",
      name: "Messages",
      events: [
        { key: "messageDelete", label: "Message Delete" },
        { key: "messageUpdate", label: "Message Edit" }
      ]
    },
    {
      id: "channels",
      name: "Channels",
      events: [
        { key: "channelCreate", label: "Channel Create" },
        { key: "channelDelete", label: "Channel Delete" },
        { key: "channelUpdate", label: "Channel Update" }
      ]
    },
    {
      id: "roles",
      name: "Roles",
      events: [
        { key: "roleCreate", label: "Role Create" },
        { key: "roleDelete", label: "Role Delete" },
        { key: "roleUpdate", label: "Role Update" }
      ]
    },
    {
      id: "members",
      name: "Members",
      events: [
        { key: "guildMemberAdd", label: "Member Join" },
        { key: "guildMemberRemove", label: "Member Leave" },
        { key: "guildMemberUpdate", label: "Member Update" }
      ]
    },
    {
      id: "voice",
      name: "Voice",
      events: [
        { key: "voiceStateUpdate", label: "Voice Join/Leave/Move" }
      ]
    },
    {
      id: "threads",
      name: "Threads",
      events: [
        { key: "threadCreate", label: "Thread Create" },
        { key: "threadDelete", label: "Thread Delete" },
        { key: "threadUpdate", label: "Thread Update" },
        { key: "threadMemberUpdate", label: "Thread Member Update" }
      ]
    },
    {
      id: "invites",
      name: "Invites & Webhooks",
      events: [
        { key: "inviteCreate", label: "Invite Create" },
        { key: "inviteDelete", label: "Invite Delete" },
        { key: "webhookUpdate", label: "Webhook Update" }
      ]
    },
    {
      id: "server",
      name: "Server",
      events: [
        { key: "guildUpdate", label: "Server Update" }
      ]
    },
    {
      id: "moderation",
      name: "Moderation",
      events: [
        { key: "guildBanAdd", label: "Member Ban" },
        { key: "guildBanRemove", label: "Member Unban" },
        { key: "guildMemberKick", label: "Member Kick" },
        { key: "guildMemberTimeout", label: "Member Timeout" },
        { key: "messageDeleteBulk", label: "Message Purge (Bulk Delete)" }
      ]
    }
  ];

  const verificationModal = state.activeVerification ? `
    <div class="verification-modal-overlay">
      <div class="verification-modal">
        <h3>Verify Thread/Forum Channel</h3>
        <p>Log channel setup for <strong>${state.activeVerification.eventKey}</strong>.</p>
        <p>1. Copy this verification code:</p>
        <div class="verification-code-box">
          <code>!verify-log ${state.activeVerification.token}</code>
          <button type="button" class="copy-btn" data-copy-verification-token>Copy</button>
        </div>
        <p>2. Paste this code into the Discord thread or forum channel you wish to use.</p>
        <p>3. The bot will automatically verify the channel and configure it.</p>
        <div class="modal-actions">
          <button type="button" class="button" data-refresh-logging>Check Verification</button>
          <button type="button" class="button ghost" data-close-verification>Close</button>
        </div>
      </div>
    </div>
  ` : "";

  const channelTabContent = `
    <div class="setting-grid single" style="margin-bottom: 20px;">
      <p style="color: #9e969a;">Configure target channels for specific log types. Grouped by category.</p>
    </div>
    ${categories.map(cat => {
      const categoryChannel = (() => {
        const channelIds = cat.events.map(evt => state.draft.logging.eventChannels?.[evt.key] || "");
        const first = channelIds[0];
        if (first && channelIds.every(id => id === first)) {
          return first;
        }
        return "";
      })();
      return `
        <div class="panel">
          <div class="panel-head">
            <div class="panel-title">
              <span class="mini-icon"><i data-lucide="folder"></i></span>
              <div>
                <h2>${escapeHtml(cat.name)}</h2>
                <p>Set logging channel for this category.</p>
              </div>
            </div>
            <div style="min-width: 200px;">
              <select class="select" data-category-mass-select="${escapeAttr(cat.id)}">
                <option value="" ${categoryChannel === "" ? "selected" : ""}>Set category channel...</option>
                ${textChannels().map(ch => `<option value="${ch.id}" ${ch.id === categoryChannel ? "selected" : ""}>${escapeHtml(ch.label || ch.name)}</option>`).join("")}
              </select>
            </div>
          </div>
          <div class="setting-grid" style="grid-template-columns: 1fr; gap: 15px; padding: 20px;">
            ${cat.events.map(evt => {
              const currentChan = state.draft.logging.eventChannels?.[evt.key] || "";
              return `
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #2b2d31; padding-bottom: 10px;">
                  <label style="font-weight: 500;">${escapeHtml(evt.label)}</label>
                  <div style="display: flex; gap: 10px; align-items: center;">
                    <select class="select" data-bind="logging.eventChannels.${evt.key}" style="min-width: 200px;">
                      <option value="">Disabled</option>
                      ${textChannels().map(ch => `<option value="${ch.id}" ${ch.id === currentChan ? "selected" : ""}>${escapeHtml(ch.label || ch.name)}</option>`).join("")}
                    </select>
                    <button type="button" class="button ghost" data-verify-thread="${escapeAttr(evt.key)}" style="padding: 6px 12px; height: auto; font-size: 0.8em;">Thread Setup</button>
                  </div>
                </div>
              `;
            }).join("")}
          </div>
        </div>
      `;
    }).join("")}
  `;

  const ignoreTabContent = `
    <div class="panel">
      <div class="panel-head">
        <div class="panel-title">
          <span class="mini-icon"><i data-lucide="eye-off"></i></span>
          <div><h2>Ignore Settings</h2><p>Ignore specific channels, roles, users, and message components from logs.</p></div>
        </div>
      </div>
      <div class="setting-grid">
        <div class="field">${toggleLine("logging.ignoreEmbeds", "Ignore Embed Messages")}</div>
        <div class="field">${toggleLine("logging.ignorePolls", "Ignore Poll Deletions")}</div>
        <div class="field">${toggleLine("logging.ignoreSticky", "Ignore Sticky Messages")}</div>
        <div class="field">${toggleLine("logging.applyIgnoreToVoice", "Apply Ignores to Voice Events")}</div>
      </div>
    </div>
    <div class="panel">
      <div class="panel-head">
        <div class="panel-title">
          <span class="mini-icon"><i data-lucide="alert-octagon"></i></span>
          <div><h2>Bypass Config</h2><p>Bypass logging entirely for selected resources.</p></div>
        </div>
      </div>
      <div class="setting-grid">
        ${multiSelectField("Ignored Roles", "logging.ignoredRoles", state.data.roles)}
        ${textareaField("Ignored Channel IDs (one per line)", "logging.ignoredChannels", { lines: true })}
        ${textareaField("Ignored User IDs (one per line)", "logging.ignoredUsers", { lines: true })}
      </div>
    </div>
  `;

  return `
    <section class="page wide">
      ${pageHead("file-text", "Audit Logging Configuration", "Setup logging channels, verification codes, and ignore preferences.")}
      
      <div class="panel">
        <div class="panel-head">
          <div class="panel-title">
            <span class="mini-icon"><i data-lucide="file-text"></i></span>
            <div>
              <h2>${enabled ? "Logging active" : "Logging disabled"}</h2>
              <p>${enabled ? "Security and server events are being logged." : "Enable to start logging events."}</p>
            </div>
          </div>
          ${toggleField("logging.isEnabled")}
        </div>
      </div>

      ${renderLoggingTabs()}
      
      <div class="logging-tab-content" style="margin-top: 20px;">
        ${state.loggingTab === "ignores" ? ignoreTabContent : channelTabContent}
      </div>

      ${verificationModal}

      <style>
        .verification-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: rgba(0, 0, 0, 0.75);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 10000;
        }
        .verification-modal {
          background: #1e1f22;
          border: 1px solid #3f4147;
          border-radius: 8px;
          padding: 24px;
          max-width: 500px;
          width: 90%;
          box-shadow: 0 4px 15px rgba(0,0,0,0.5);
          color: #dbdee1;
        }
        .verification-modal h3 {
          margin-top: 0;
          color: #fff;
        }
        .verification-code-box {
          display: flex;
          background: #2b2d31;
          border: 1px solid #1e1f22;
          border-radius: 4px;
          padding: 12px;
          margin: 16px 0;
          justify-content: space-between;
          align-items: center;
        }
        .verification-code-box code {
          color: #5865f2;
          font-weight: bold;
          font-family: monospace;
          user-select: all;
        }
        .verification-code-box .copy-btn {
          background: #5865f2;
          color: #fff;
          border: none;
          padding: 6px 12px;
          border-radius: 4px;
          cursor: pointer;
        }
        .verification-code-box .copy-btn:hover {
          background: #4752c4;
        }
        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          margin-top: 24px;
        }
      </style>
    </section>
  `;
}

function renderMusic() {
  return `
    <section class="page">
      ${pageHead("music", "Music", "24/7 player persistence.")}
      <div class="panel">
        <div class="panel-head">
          <div class="panel-title">
            <span class="mini-icon"><i data-lucide="activity"></i></span>
            <div><h2>247 mode</h2><p>Reconnects the music player after restarts.</p></div>
          </div>
          ${toggleField("music247.enabled")}
        </div>
        <div class="setting-grid">
          ${selectField("Text channel", "music247.textChannelId", textChannels(), "Select text channel")}
          ${selectField("Voice channel", "music247.voiceChannelId", voiceChannels(), "Select voice channel")}
        </div>
      </div>
    </section>
  `;
}


function renderLeveling() {
  return `
    <section class="page wide">
      ${pageHead("award", "Leveling", "Free chat and voice XP system.")}
      <div class="panel">
        <div class="panel-head">
          <div class="panel-title">
            <span class="mini-icon"><i data-lucide="zap"></i></span>
            <div><h2>Chat and VC leveling</h2><p>XP system for messages and voice activity.</p></div>
          </div>
          ${toggleField("premium.leveling.enabled")}
        </div>
        <div class="setting-grid">
          ${selectField("Level-up channel", "premium.leveling.announceChannelId", textChannels(), "Current channel")}
          ${inputField("Level message", "premium.leveling.levelUpMessage", "text")}
          ${inputField("Chat XP min", "premium.leveling.chatXpMin", "number", { min: 1, max: 100 })}
          ${inputField("Chat XP max", "premium.leveling.chatXpMax", "number", { min: 1, max: 200 })}
          ${inputField("Chat cooldown seconds", "premium.leveling.chatCooldownSeconds", "number", { min: 5, max: 600 })}
          ${inputField("Voice XP per minute", "premium.leveling.voiceXpPerMinute", "number", { min: 1, max: 100 })}
          <div class="field">${toggleLine("premium.leveling.chatEnabled", "Chat XP")}</div>
          <div class="field">${toggleLine("premium.leveling.voiceEnabled", "Voice XP")}</div>
        </div>
      </div>
    </section>
  `;
}

function renderVcGuard() {
  return `
    <section class="page wide">
      ${pageHead("shield", "VC Guard", "Protect voice channels with bypass roles.")}
      <div class="panel">
        <div class="panel-head">
          <div class="panel-title">
            <span class="mini-icon"><i data-lucide="shield-check"></i></span>
            <div><h2>VC guard</h2><p>Disconnect users from protected voice channels unless they bypass.</p></div>
          </div>
          ${toggleField("premium.vcGuard.enabled")}
        </div>
        <div class="setting-grid">
          ${multiSelectField("Protected voice channels", "premium.vcGuard.protectedChannels", voiceChannels())}
          ${multiSelectField("Bypass roles", "premium.vcGuard.bypassRoles", state.data.roles)}
          ${selectField("Log channel", "premium.vcGuard.logChannelId", textChannels(), "No log channel")}
          ${inputField("DM message", "premium.vcGuard.message", "text")}
        </div>
      </div>
    </section>
  `;
}

function renderSticky() {
  return `
    <section class="page wide">
      ${pageHead("pin", "Sticky Messages", "Keep one message pinned to the bottom of a channel.")}
      <div class="panel">
        <div class="panel-head">
          <div class="panel-title">
            <span class="mini-icon"><i data-lucide="message-square"></i></span>
            <div><h2>Sticky message</h2><p>Reposts a configured message at the bottom of a channel.</p></div>
          </div>
          ${toggleField("premium.sticky.enabled")}
        </div>
        <div class="setting-grid">
          ${selectField("Channel", "premium.sticky.messages.0.channelId", textChannels(), "Select channel")}
          ${inputField("Cooldown seconds", "premium.sticky.messages.0.cooldownSeconds", "number", { min: 5, max: 600 })}
          ${textareaField("Sticky content", "premium.sticky.messages.0.content")}
        </div>
      </div>
    </section>
  `;
}

function renderAutomod() {
  return `
    <section class="page">
      ${pageHead("gavel", "Auto Moderation", "Anti link and anti spam settings.")}
      <div class="panel">
        <div class="panel-head">
          <div class="panel-title">
            <span class="mini-icon"><i data-lucide="link"></i></span>
            <div><h2>Anti link</h2><p>Delete invite and URL spam using the bot event module.</p></div>
          </div>
          ${toggleField("automod.antilink.isEnabled")}
        </div>
        <div class="setting-grid">
          ${multiSelectField("Whitelisted roles", "automod.antilink.whitelistRoles", state.data.roles)}
          ${textareaField("Whitelisted user IDs", "automod.antilink.whitelistUsers", { lines: true })}
        </div>
      </div>
      <div class="panel">
        <div class="panel-head">
          <div class="panel-title">
            <span class="mini-icon"><i data-lucide="mail-warning"></i></span>
            <div><h2>Anti spam</h2><p>Message threshold, timeframe, and bypass lists.</p></div>
          </div>
          ${toggleField("automod.antispam.isEnabled")}
        </div>
        <div class="setting-grid">
          ${inputField("Message threshold", "automod.antispam.messageThreshold", "number", { min: 2, max: 20 })}
          ${inputField("Timeframe seconds", "automod.antispam.timeframe", "number", { min: 3, max: 120 })}
          ${multiSelectField("Whitelisted roles", "automod.antispam.whitelistRoles", state.data.roles)}
          ${textareaField("Whitelisted user IDs", "automod.antispam.whitelistUsers", { lines: true })}
        </div>
      </div>
    </section>
  `;
}

function renderAntinuke() {
  const antinuke = state.draft.antinuke || {};
  const canManageExtraOwners = state.data.viewer?.canManageExtraOwners !== false;
  const enabled = Boolean(antinuke.isEnabled);
  return `
    <section class="page wide">
      ${pageHead("bomb", "Anti Nuke Security", "Server protection, trusted users, and audit logging.")}
      <div class="panel">
        <div class="panel-head">
          <div class="panel-title">
            <span class="mini-icon"><i data-lucide="shield-alert"></i></span>
            <div>
              <h2>${enabled ? "Protection online" : "Protection disabled"}</h2>
              <p>${enabled ? "Destructive actions are watched and logged." : "Enable to protect the server from raids and staff abuse."}</p>
            </div>
          </div>
          ${toggleField("antinuke.isEnabled")}
        </div>
        <div class="security-grid">
          ${antinukeProtections.map((item) => `
            <div class="security-tile">
              <span class="security-dot ${enabled ? "on" : ""}"></span>
              <span>${escapeHtml(item)}</span>
            </div>
          `).join("")}
        </div>
      </div>

      <div class="grid">
        <div class="panel">
          <div class="panel-title">
            <span class="mini-icon"><i data-lucide="file-text"></i></span>
            <div><h2>Audit logging</h2><p>If enabled without a channel, the bot creates a private log channel.</p></div>
          </div>
          <div class="setting-grid single">
            ${selectField("Log channel", "antinuke.logChannelId", textChannels(), "Auto create bot-logs")}
          </div>
        </div>
        <div class="panel">
          <div class="panel-title">
            <span class="mini-icon"><i data-lucide="crown"></i></span>
            <div><h2>Extra owners</h2><p>Only the server owner and bot owners can edit this list.</p></div>
          </div>
          <div class="setting-grid single">
            ${textareaField("Extra owner IDs", "antinuke.extraOwners", { lines: true, disabled: !canManageExtraOwners })}
          </div>
        </div>
      </div>

      <div class="panel">
        <div class="panel-title">
          <span class="mini-icon"><i data-lucide="user-check"></i></span>
          <div><h2>Whitelist bypass</h2><p>Trusted users and roles are logged but not punished.</p></div>
        </div>
        <div class="setting-grid">
          ${multiSelectField("Whitelisted roles", "antinuke.whitelistRoles", state.data.roles)}
          ${textareaField("Whitelisted user IDs", "antinuke.whitelistUsers", { lines: true })}
        </div>
      </div>
    </section>
  `;
}

function renderWelcome() {
  const tabs = ["messages", "dynamic", "simulation"];
  if (!tabs.includes(state.welcomeTab)) state.welcomeTab = "messages";

  return `
    <section class="page wide">
      ${pageHead("user-plus", "Welcome Messages", "Join messages, dynamic images, and simulation.")}
      ${renderWelcomeTabs()}
      ${state.welcomeTab === "dynamic" ? renderWelcomeDynamicImages() : ""}
      ${state.welcomeTab === "simulation" ? renderWelcomeSimulation() : ""}
      ${state.welcomeTab === "messages" ? renderWelcomeMessages() : ""}
    </section>
  `;
}

function renderWelcomeTabs() {
  const items = [
    ["messages", "Messages"],
    ["dynamic", "Dynamic images"],
    ["simulation", "Simulation"],
  ];
  return `
    <div class="welcome-tabs" role="tablist" aria-label="Welcome editor tabs">
      ${items.map(([id, label]) => `
        <button class="${state.welcomeTab === id ? "active" : ""}" type="button" data-welcome-tab="${id}" role="tab" aria-selected="${state.welcomeTab === id}">
          ${escapeHtml(label)}
        </button>
      `).join("")}
    </div>
  `;
}

function renderWelcomeMessages() {
  const preview = renderWelcomePreview();
  return `
      <div class="grid">
        <div class="stack">
          <div class="panel">
            <div class="panel-head">
              <div class="panel-title">
                <span class="mini-icon"><i data-lucide="message-square"></i></span>
                <div><h2>Message</h2><p>Variables: {user}, {server_name}, {member_count}</p></div>
              </div>
              ${toggleField("welcome.enabled")}
            </div>
            <div class="setting-grid single">
              ${selectField("Channel", "welcome.channel", textChannels(), "Select channel")}
              ${textareaField("Content", "welcome.content")}
              ${inputField("Auto delete seconds", "welcome.autodel", "number", { min: 0, max: 120 })}
            </div>
          </div>
          <div class="panel">
            <div class="panel-head">
              <div class="panel-title">
                <span class="mini-icon"><i data-lucide="code"></i></span>
                <div><h2>Embed</h2><p>Optional rich message fields.</p></div>
              </div>
              ${toggleField("welcome.embed.enabled")}
            </div>
            <div class="setting-grid">
              ${inputField("Title", "welcome.embed.title", "text")}
              ${inputField("Color", "welcome.embed.color", "text")}
              ${textareaField("Description", "welcome.embed.description")}
              ${inputField("Thumbnail URL", "welcome.embed.thumbnail", "text")}
              ${inputField("Image URL", "welcome.embed.image", "text")}
              ${inputField("Footer", "welcome.embed.footer", "text")}
            </div>
          </div>
        </div>
        <div class="panel">
          <div class="panel-title">
            <span class="mini-icon"><i data-lucide="eye"></i></span>
            <div><h2>Preview</h2><p>Discord-style output.</p></div>
          </div>
          <div class="preview" data-welcome-preview>${preview}</div>
        </div>
      </div>
  `;
}

function renderWelcomeDynamicImages() {
  const dynamic = state.draft.welcome.dynamicImages;
  const templates = dynamic.templates || [];
  const currentIndex = clampIndex(state.dynamicImageIndex, templates.length);
  const current = normalizeDynamicTemplate(templates[currentIndex] || defaultDynamicTemplate("default"));
  state.dynamicImageIndex = currentIndex;
  const attached = dynamic.enabled && dynamic.attachedId === current.id;
  const prefix = `welcome.dynamicImages.templates.${currentIndex}`;
  const layers = layerDefinitions(current);
  if (!layers.some((layer) => layer.id === state.selectedLayer)) state.selectedLayer = "avatar";

  return `
    <div class="dynamic-head">
      <div>
        <h2>Dynamic images <span class="pill">${templates.length}/3</span></h2>
        <p>Create a generated PNG welcome card. It only sends when one image is attached to the welcome message.</p>
      </div>
      <label class="toggle-with-label">
        <span>Send attached image</span>
        ${toggleField("welcome.dynamicImages.enabled")}
      </label>
    </div>
    <div class="dynamic-grid">
      <div class="dynamic-library">
        ${templates.map((template, index) => `
          <article class="dynamic-card ${index === currentIndex ? "active" : ""}">
            <button class="dynamic-card-preview" type="button" data-dynamic-select="${index}">
              ${renderDynamicImageSvg(template, `card-${index}`)}
            </button>
            <div class="dynamic-card-meta">
              <strong>${escapeHtml(template.name || `Image ${index + 1}`)}</strong>
              <span>${dynamic.enabled && dynamic.attachedId === template.id ? "Attached" : "Not attached"}</span>
            </div>
            <div class="dynamic-card-actions">
              <button class="btn small primary" type="button" data-dynamic-attach="${index}">
                ${dynamic.enabled && dynamic.attachedId === template.id ? "Attached" : "Attach to message"}
              </button>
              <button class="btn small ghost" type="button" data-dynamic-select="${index}">${index === currentIndex ? "Editing" : "Edit"}</button>
              <button class="btn small danger" type="button" data-dynamic-delete="${index}" ${templates.length <= 1 ? "disabled" : ""}>Delete</button>
            </div>
          </article>
        `).join("")}
        ${templates.length < 3 ? `
          <button class="dynamic-new" type="button" data-dynamic-new>
            <span>+</span>
            <strong>New dynamic image</strong>
          </button>
        ` : ""}
      </div>
      <div class="panel dynamic-editor">
        <div class="panel-head">
          <div class="panel-title">
            <span class="mini-icon"><i data-lucide="image"></i></span>
            <div><h2>Image editor</h2><p>${attached ? "This image is attached to the welcome message." : "Edit the image, then attach it when ready."}</p></div>
          </div>
        </div>
        <div class="image-editor-grid">
          <div class="image-stage" data-dynamic-preview>
            ${renderDynamicImageSvg(current, "editor")}
          </div>
          <div class="editor-controls-grid">
            <div class="layer-panel">
              <strong>Layers</strong>
              ${layers.map((layer) => `
                <button class="${state.selectedLayer === layer.id ? "active" : ""}" type="button" data-layer-select="${layer.id}">
                  ${escapeHtml(layer.label)}
                  ${layer.hidden ? "<span>Hidden</span>" : layer.custom ? "<span>Custom</span>" : ""}
                </button>
              `).join("")}
              <div class="layer-add-row">
                <button type="button" data-layer-add="text">+ Text</button>
                <button type="button" data-layer-add="rect">+ Shape</button>
                <button type="button" data-layer-add="image">+ Image</button>
              </div>
            </div>
            <div class="inspector-panel">
              ${renderLayerInspector(current, prefix)}
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderWelcomeSimulation() {
  const dynamic = getAttachedDynamicTemplate();
  return `
    <div class="grid">
      <div class="panel">
        <div class="panel-title">
          <span class="mini-icon"><i data-lucide="play"></i></span>
          <div><h2>Join simulation</h2><p>Preview using the current dashboard user as the joining member.</p></div>
        </div>
        <div class="preview simulation-preview" data-welcome-preview>${renderWelcomePreview()}</div>
      </div>
      <div class="panel">
        <div class="panel-title">
          <span class="mini-icon"><i data-lucide="file-image"></i></span>
          <div><h2>Attached image</h2><p>${dynamic ? "This PNG will be attached with the message." : "No dynamic image is attached."}</p></div>
        </div>
        <div class="image-stage simulation-image" data-simulation-image>
          ${dynamic ? renderDynamicImageSvg(dynamic, "simulation") : `<div class="empty-image">Attach a dynamic image from the Dynamic images tab.</div>`}
        </div>
      </div>
    </div>
  `;
}

function renderRoles() {
  return `
    <section class="page">
      ${pageHead("users", "Roles", "Command roles, join roles, and voice role.")}
      <div class="panel">
        <div class="panel-title">
          <span class="mini-icon"><i data-lucide="sliders"></i></span>
          <div><h2>Role command targets</h2><p>Choose what role each role command gives or removes.</p></div>
        </div>
        <div class="setting-grid">
          ${selectField("Manager role required", "roles.reqrole", state.data.roles, "Required role not set")}
          ${selectField(">official gives", "roles.official", state.data.roles, "Not set")}
          ${selectField(">friend gives", "roles.friend", state.data.roles, "Not set")}
          ${selectField(">guest gives", "roles.guest", state.data.roles, "Not set")}
          ${selectField(">girl gives", "roles.girl", state.data.roles, "Not set")}
          ${selectField(">vip gives", "roles.vip", state.data.roles, "Not set")}
        </div>
      </div>
      <div class="panel">
        <div class="panel-title">
          <span class="mini-icon"><i data-lucide="user-plus"></i></span>
          <div><h2>Join autorole</h2><p>Roles added automatically when humans or bots join.</p></div>
        </div>
        <div class="setting-grid">
          ${multiSelectField("Human join roles", "autorole.humanRoles", state.data.roles, "No custom roles found")}
          ${multiSelectField("Bot join roles", "autorole.botRoles", state.data.roles, "No custom roles found")}
        </div>
      </div>
      <div class="panel">
        <div class="panel-title">
          <span class="mini-icon"><i data-lucide="mic"></i></span>
          <div><h2>Voice role</h2><p>Role assigned while a member is in voice.</p></div>
        </div>
        <div class="setting-grid single">
          ${selectField("Voice role", "voiceRole.roleId", state.data.roles, "Disabled")}
        </div>
      </div>
    </section>
  `;
}

function renderSavebar() {
  return `
    <div class="savebar ${state.dirty ? "show" : ""}" data-savebar>
      <strong>Unsaved changes</strong>
      <button class="btn small ghost" type="button" data-reset ${state.saving ? "disabled" : ""}>Reset</button>
      <button class="btn small primary" type="button" data-save ${state.saving ? "disabled" : ""}>${state.saving ? "Saving..." : "Save changes"}</button>
    </div>
  `;
}

function pageHead(icon, title, subtitle) {
  const iconHtml = icon.length > 2 
    ? `<i data-lucide="${icon}"></i>`
    : escapeHtml(icon);
  return `
    <div class="page-head">
      <div class="page-title">
        <span class="title-icon">${iconHtml}</span>
        <div>
          <h1>${title}</h1>
          <p>${escapeHtml(subtitle)}</p>
        </div>
      </div>
    </div>
  `;
}

function shortcutCard(title, label, text, page, action) {
  const pageObj = pages.find(p => p.id === page);
  const iconName = pageObj ? pageObj.icon : "box";
  const statusPath = pageObj?.status;
  const hasToggle = statusPath && statusPath !== "roles.any";
  const on = hasToggle ? statusFor(statusPath) : false;
  return `
    <article class="card ${hasToggle && !on ? "disabled-card" : ""}">
      <div class="card-head-row">
        <span class="mini-icon"><i data-lucide="${iconName}"></i></span>
        ${hasToggle ? `
          <label class="toggle small">
            <input type="checkbox" data-card-toggle="${statusPath}" ${on ? "checked" : ""}>
            <span></span>
          </label>
        ` : ""}
      </div>
      <h3>${escapeHtml(title)}</h3>
      <p>${escapeHtml(text)}</p>
      <div class="card-actions">
        <button class="btn" type="button" data-nav="${page}">${escapeHtml(action)}</button>
      </div>
    </article>
  `;
}

function miniStat(label, value) {
  return `<div class="mini-stat"><strong>${escapeHtml(value)}</strong><span>${escapeHtml(label)}</span></div>`;
}

function inputField(label, path, type = "text", attrs = {}) {
  const value = getPath(state.draft, path) ?? "";
  return `
    <div class="field">
      <label>${escapeHtml(label)}</label>
      <input class="input" data-bind="${path}" type="${type}" value="${escapeAttr(value)}"
        ${attrs.min !== undefined ? `min="${attrs.min}"` : ""}
        ${attrs.max !== undefined ? `max="${attrs.max}"` : ""}
        ${attrs.max !== undefined ? `maxlength="${attrs.max}"` : ""}
        ${attrs.disabled ? "disabled" : ""}>
    </div>
  `;
}

function imageSourceField(label, path) {
  const value = String(getPath(state.draft, path) || "");
  const uploaded = isDataImageSource(value);
  const displayValue = uploaded ? "Uploaded local image" : value;
  return `
    <div class="field full image-source-field">
      <label>${escapeHtml(label)}</label>
      <div class="image-source-row">
        <input class="input" data-image-url-input="${escapeAttr(path)}" type="text" value="${escapeAttr(displayValue)}" placeholder="Paste image URL or upload local file">
        <button class="btn small ghost" type="button" data-image-upload="${escapeAttr(path)}">Upload</button>
        <button class="btn small danger" type="button" data-image-clear="${escapeAttr(path)}" ${value ? "" : "disabled"}>Clear</button>
        <input class="hidden-file" data-image-file="${escapeAttr(path)}" type="file" accept="image/png,image/jpeg,image/webp,image/gif">
      </div>
      <small>${uploaded ? "Local image stored with this template." : "Use a CDN/image URL or upload PNG, JPG, WebP, or GIF."}</small>
    </div>
  `;
}

function textareaField(label, path, options = {}) {
  const value = getPath(state.draft, path);
  const text = options.lines ? (Array.isArray(value) ? value.join("\n") : "") : String(value || "");
  return `
    <div class="field full">
      <label>${escapeHtml(label)}</label>
      <textarea class="textarea" data-bind="${path}" ${options.lines ? "data-lines=\"true\"" : ""} ${options.disabled ? "disabled" : ""}>${escapeHtml(text)}</textarea>
      ${options.disabled ? `<small>Locked for non-owner dashboard users.</small>` : ""}
    </div>
  `;
}

function selectField(label, path, options, placeholder = "Select") {
  const value = getPath(state.draft, path) || "";
  const emptyPlaceholder = options.length ? placeholder : "No entries available";
  return `
    <div class="field">
      <label>${escapeHtml(label)}</label>
      <select class="select" data-bind="${path}">
        <option value="">${escapeHtml(emptyPlaceholder)}</option>
        ${options.map((item) => `<option value="${item.id}" ${item.id === value ? "selected" : ""}>${escapeHtml(item.label || item.name)}</option>`).join("")}
      </select>
    </div>
  `;
}

function multiSelectField(label, path, options, emptyText = "No entries available") {
  const selected = new Set(getPath(state.draft, path) || []);
  return `
    <div class="field">
      <label>${escapeHtml(label)}</label>
      <div class="check-list" data-check-list="${escapeAttr(path)}" role="group" aria-label="${escapeAttr(label)}">
        ${options.map((item) => `
          <label class="check-item">
            <input type="checkbox" data-multi-check="${escapeAttr(path)}" value="${escapeAttr(item.id)}" ${selected.has(item.id) ? "checked" : ""}>
            <span class="check-box"></span>
            <span class="check-label">${escapeHtml(item.label || item.name)}</span>
          </label>
        `).join("") || `<div class="check-empty">${escapeHtml(emptyText)}</div>`}
      </div>
      <small>${options.length ? "Click entries to toggle them." : "Create custom Discord roles first, then refresh this dashboard."}</small>
    </div>
  `;
}

function toggleField(path, options = {}) {
  const checked = Boolean(getPath(state.draft, path));
  return `
    <label class="toggle">
      <input type="checkbox" data-bind="${path}" ${checked ? "checked" : ""} ${options.disabled ? "disabled" : ""}>
      <span></span>
    </label>
  `;
}

function toggleLine(path, label) {
  return `
    <div class="row-head">
      <label>${escapeHtml(label)}</label>
      ${toggleField(path)}
    </div>
  `;
}

function updateWelcomePreview() {
  const previews = app.querySelectorAll("[data-welcome-preview]");
  if (!previews.length || !state.draft?.welcome) return;
  previews.forEach((preview) => {
    preview.innerHTML = renderWelcomePreview();
  });
  if (window.lucide) window.lucide.createIcons();
}

function renderWelcomePreview() {
  const guild = state.data.guild;
  const bot = state.data.bot;
  const welcome = state.draft.welcome;
  const embed = welcome.embed || {};
  const dynamic = getAttachedDynamicTemplate();
  const content = replaceVars(welcome.content || "", guild);
  const embedEnabled = Boolean(embed.enabled);
  const title = replaceVars(embed.title || "", guild);
  const description = replaceVars(embed.description || "", guild);
  const footer = replaceVars(embed.footer || "", guild);
  const hasEmbed = embedEnabled && Boolean(title || description || footer || embed.image || embed.thumbnail);

  return `
    <div class="discord-message">
      <div class="discord-avatar"></div>
      <div>
        <div><span class="discord-name">${escapeHtml(bot.name)}</span><span class="discord-bot">APP</span></div>
        ${content ? `<div class="discord-content">${escapeHtml(content)}</div>` : ""}
        ${hasEmbed ? `
          <div class="preview" style="margin-top:10px;border-left:4px solid ${escapeAttr(embed.color || "#149bff")}">
            ${title ? `<strong>${escapeHtml(title)}</strong>` : ""}
            ${description ? `<div class="discord-content">${escapeHtml(description)}</div>` : ""}
            ${footer ? `<small class="muted">${escapeHtml(footer)}</small>` : ""}
          </div>
        ` : ""}
        ${dynamic ? `<div class="welcome-preview-image">${renderDynamicImageSvg(dynamic, "message-preview")}</div>` : ""}
      </div>
    </div>
  `;
}

function updateDynamicImagePreview() {
  const current = currentDynamicTemplate();
  app.querySelectorAll("[data-dynamic-preview]").forEach((node) => {
    node.innerHTML = renderDynamicImageSvg(current, "editor-live");
  });

  const attached = getAttachedDynamicTemplate();
  app.querySelectorAll("[data-simulation-image]").forEach((node) => {
    node.innerHTML = attached
      ? renderDynamicImageSvg(attached, "simulation-live")
      : `<div class="empty-image">Attach a dynamic image from the Dynamic images tab.</div>`;
  });
  bindDynamicEditorDrag();
}

function getAttachedDynamicTemplate() {
  const dynamic = state.draft?.welcome?.dynamicImages;
  if (!dynamic?.enabled) return null;
  const templates = dynamic.templates || [];
  return templates.find((template) => template.id === dynamic.attachedId) || templates[0] || null;
}

function currentDynamicTemplate() {
  const templates = state.draft?.welcome?.dynamicImages?.templates || [];
  return templates[clampIndex(state.dynamicImageIndex, templates.length)] || defaultDynamicTemplate("default");
}

function renderDynamicImageSvg(template, suffix = "preview") {
  const safe = normalizeDynamicTemplate(template, suffix);
  const selected = state.selectedLayer || "avatar";
  const bg = safe.background;
  const layers = safe.layers;
  const bgImage = bg.imageUrl ? backgroundImageSvg(bg, safe.width, safe.height) : "";

  return `
    <svg class="dynamic-svg" data-dynamic-svg viewBox="0 0 ${safe.width} ${safe.height}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" role="img" aria-label="${escapeAttr(safe.name)}">
      <rect class="dynamic-layer ${selected === "background" ? "selected" : ""}" data-dynamic-layer="background" width="${safe.width}" height="${safe.height}" fill="${escapeAttr(bg.color)}"></rect>
      ${bgImage}
      ${selected === "background" ? `<rect class="layer-outline" x="1" y="1" width="${safe.width - 2}" height="${safe.height - 2}" fill="none"></rect>` : ""}
      ${renderRectSvg(layers.accentLeft, selected)}
      ${renderRectSvg(layers.accentRight, selected)}
      ${renderRectSvg(layers.card, selected)}
      ${renderBadgeSvg(layers.badge, selected)}
      ${renderAvatarSvg(layers.avatar, selected, safe.id, suffix)}
      ${renderTextSvg(layers.title, selected)}
      ${renderTextSvg(layers.subtitle, selected)}
      ${safe.customLayers.map((layer) => renderCustomLayerSvg(layer, selected, safe.id, suffix)).join("")}
    </svg>
  `;
}

function renderCustomLayerSvg(layer, selected, templateId, suffix) {
  if (layer.type === "rect") return renderRectSvg(layer, selected);
  if (layer.type === "image") return renderImageSvg(layer, selected, templateId, suffix);
  return renderTextSvg(layer, selected);
}

function renderRectSvg(layer, selected) {
  if (!layer?.visible) return "";
  return `
    <g class="dynamic-layer ${selected === layer.id ? "selected" : ""}" data-dynamic-layer="${escapeAttr(layer.id)}">
      <rect x="${layer.x}" y="${layer.y}" width="${layer.width}" height="${layer.height}" rx="${layer.radius}" fill="${escapeAttr(layer.color)}" opacity="${layer.opacity / 100}"></rect>
      ${renderLayerSelection(layer, selected)}
    </g>
  `;
}

function renderBadgeSvg(layer, selected) {
  if (!layer?.visible) return "";
  const text = replaceImageVars(layer.text);
  return `
    <g class="dynamic-layer ${selected === layer.id ? "selected" : ""}" data-dynamic-layer="${escapeAttr(layer.id)}">
      <rect x="${layer.x}" y="${layer.y}" width="${layer.width}" height="${layer.height}" rx="${layer.radius}" fill="${escapeAttr(layer.color)}" opacity="${layer.opacity / 100}"></rect>
      <text x="${textX(layer)}" y="${layer.y + layer.height / 2 + layer.fontSize * 0.34}" text-anchor="${textAnchor(layer.align)}" fill="${escapeAttr(layer.textColor)}" font-size="${layer.fontSize}" font-weight="${layer.fontWeight}" opacity="${layer.opacity / 100}">${escapeHtml(text)}</text>
      ${renderLayerSelection(layer, selected)}
    </g>
  `;
}

function renderAvatarSvg(layer, selected, templateId, suffix) {
  if (!layer?.visible) return "";
  const clipId = `clip-${escapeAttr(templateId)}-${escapeAttr(suffix)}-${escapeAttr(layer.id)}`;
  const size = layer.size || layer.width;
  const imageUrl = layer.imageUrl || "";
  const cx = layer.x + size / 2;
  const cy = layer.y + size / 2;
  return `
    <g class="dynamic-layer ${selected === layer.id ? "selected" : ""}" data-dynamic-layer="${escapeAttr(layer.id)}">
      <defs><clipPath id="${clipId}"><rect x="${layer.x}" y="${layer.y}" width="${size}" height="${size}" rx="${layer.radius}"></rect></clipPath></defs>
      <rect x="${layer.x - layer.borderWidth}" y="${layer.y - layer.borderWidth}" width="${size + layer.borderWidth * 2}" height="${size + layer.borderWidth * 2}" rx="${layer.radius + layer.borderWidth}" fill="${escapeAttr(layer.borderColor)}"></rect>
      ${imageUrl ? `<image href="${escapeAttr(imageUrl)}" xlink:href="${escapeAttr(imageUrl)}" x="${layer.x}" y="${layer.y}" width="${size}" height="${size}" preserveAspectRatio="${imagePreserveAspect(layer.imageFit)}" clip-path="url(#${clipId})" referrerpolicy="no-referrer"></image>` : `
        <g clip-path="url(#${clipId})">
          <rect x="${layer.x}" y="${layer.y}" width="${size}" height="${size}" rx="${layer.radius}" fill="#5865f2"></rect>
          <circle cx="${cx}" cy="${cy - size * 0.13}" r="${size * 0.18}" fill="#ffffff" opacity="0.94"></circle>
          <path d="M ${cx - size * 0.28} ${cy + size * 0.28} Q ${cx} ${cy + size * 0.02} ${cx + size * 0.28} ${cy + size * 0.28} Z" fill="#ffffff" opacity="0.94"></path>
        </g>
      `}
      ${renderLayerSelection({ ...layer, width: size, height: size }, selected)}
    </g>
  `;
}

function renderTextSvg(layer, selected) {
  if (!layer?.visible) return "";
  const text = replaceImageVars(layer.text);
  return `
    <g class="dynamic-layer ${selected === layer.id ? "selected" : ""}" data-dynamic-layer="${escapeAttr(layer.id)}">
      <rect class="layer-hitbox" x="${layer.x}" y="${layer.y}" width="${layer.width}" height="${layer.height}" fill="transparent"></rect>
      <text x="${textX(layer)}" y="${layer.y + layer.height / 2 + layer.fontSize * 0.34}" text-anchor="${textAnchor(layer.align)}" fill="${escapeAttr(layer.textColor)}" font-size="${layer.fontSize}" font-weight="${layer.fontWeight}" font-style="${layer.italic ? "italic" : "normal"}" opacity="${layer.opacity / 100}">${escapeHtml(text)}</text>
      ${renderLayerSelection(layer, selected)}
    </g>
  `;
}

function renderImageSvg(layer, selected, templateId, suffix) {
  if (!layer?.visible) return "";
  const clipId = `clip-${escapeAttr(templateId)}-${escapeAttr(suffix)}-${escapeAttr(layer.id)}`;
  return `
    <g class="dynamic-layer ${selected === layer.id ? "selected" : ""}" data-dynamic-layer="${escapeAttr(layer.id)}">
      <defs><clipPath id="${clipId}"><rect x="${layer.x}" y="${layer.y}" width="${layer.width}" height="${layer.height}" rx="${layer.radius}"></rect></clipPath></defs>
      <rect x="${layer.x}" y="${layer.y}" width="${layer.width}" height="${layer.height}" rx="${layer.radius}" fill="${escapeAttr(layer.color)}" opacity="${layer.opacity / 100}"></rect>
      ${layer.imageUrl ? `<image href="${escapeAttr(layer.imageUrl)}" xlink:href="${escapeAttr(layer.imageUrl)}" x="${layer.x}" y="${layer.y}" width="${layer.width}" height="${layer.height}" preserveAspectRatio="${imagePreserveAspect(layer.imageFit)}" clip-path="url(#${clipId})" opacity="${layer.opacity / 100}" referrerpolicy="no-referrer"></image>` : ""}
      ${layer.borderWidth > 0 ? `<rect x="${layer.x}" y="${layer.y}" width="${layer.width}" height="${layer.height}" rx="${layer.radius}" fill="none" stroke="${escapeAttr(layer.borderColor)}" stroke-width="${layer.borderWidth}"></rect>` : ""}
      ${renderLayerSelection(layer, selected)}
    </g>
  `;
}

function renderLayerSelection(layer, selected) {
  if (selected !== layer.id) return "";
  const width = layer.width || layer.size || 1;
  const height = layer.height || layer.size || 1;
  return `
    <rect class="layer-outline" x="${layer.x}" y="${layer.y}" width="${width}" height="${height}" fill="none"></rect>
    <rect class="resize-handle" data-dynamic-resize="${escapeAttr(layer.id)}" x="${layer.x + width - 8}" y="${layer.y + height - 8}" width="16" height="16" rx="4"></rect>
  `;
}

function backgroundImageSvg(background, width, height) {
  let drawW = width;
  let drawH = height;
  let x = background.x;
  let y = background.y;
  const scale = background.scale / 100;
  if (background.fit === "original") {
    drawW = width * scale;
    drawH = height * scale;
    x = (width - drawW) / 2 + background.x;
    y = (height - drawH) / 2 + background.y;
  } else if (background.fit !== "stretch") {
    drawW = width * scale;
    drawH = height * scale;
    x = (width - drawW) / 2 + background.x;
    y = (height - drawH) / 2 + background.y;
  }
  return `<image class="dynamic-layer ${state.selectedLayer === "background" ? "selected" : ""}" data-dynamic-layer="background" href="${escapeAttr(background.imageUrl)}" xlink:href="${escapeAttr(background.imageUrl)}" x="${x}" y="${y}" width="${drawW}" height="${drawH}" preserveAspectRatio="${imagePreserveAspect(background.fit)}" opacity="${background.opacity / 100}" referrerpolicy="no-referrer"></image>`;
}

function replaceImageVars(text) {
  const guild = state.data?.guild || {};
  const viewer = state.data?.viewer || state.me?.user || {};
  const displayName = viewer.globalName || viewer.username || "NewMember";
  const memberCount = String(guild.memberCount || 0);
  return String(text || "")
    .replaceAll("{user}", displayName)
    .replaceAll("{user_name}", viewer.username || displayName)
    .replaceAll("{user_display}", displayName)
    .replaceAll("{server_name}", guild.name || "Server")
    .replaceAll("{member_count}", memberCount)
    .replaceAll("{server_memberCount}", memberCount)
    .replaceAll("${userglobalnickname}", displayName)
    .replaceAll("$userglobalnickname", displayName)
    .replaceAll("${guildname}", guild.name || "Server")
    .replaceAll("$guildname", guild.name || "Server")
    .replaceAll("${guildmembercount}", memberCount)
    .replaceAll("$guildmembercount", memberCount);
}

function defaultDynamicTemplate(id = "default") {
  const label = id === "default" ? "Welcome card" : "Welcome card";
  const width = 760;
  const height = 360;
  return {
    id,
    name: label,
    width,
    height,
    background: {
      color: "#111820",
      imageUrl: "",
      fit: "cover",
      x: 0,
      y: 0,
      scale: 100,
      opacity: 100,
    },
    layers: defaultDynamicLayers(width, height),
  };
}

function normalizeDynamicTemplate(template = {}, suffix = "") {
  const fallback = defaultDynamicTemplate(template.id || "default");
  const width = clampNumber(template.width, 420, 1200, fallback.width);
  const height = clampNumber(template.height, 220, 640, fallback.height);
  const migrated = migrateOldDynamicTemplate(template, width, height);
  return {
    id: String(template.id || fallback.id || suffix || "default").replace(/[^a-z0-9_-]/gi, "") || "default",
    name: String(template.name || fallback.name).slice(0, 48),
    width,
    height,
    background: normalizeDynamicBackground(template.background || migrated.background || fallback.background, template),
    layers: normalizeDynamicLayers(template.layers || migrated.layers || fallback.layers, width, height),
    customLayers: normalizeDynamicCustomLayers(template.customLayers || [], width, height),
  };
}

function defaultDynamicLayers(width, height) {
  return {
    accentLeft: rectDynamicLayer("accentLeft", "Accent left", width * 0.07, height * 0.12, width * 0.33, height * 0.25, "#12c8d8", 22),
    accentRight: rectDynamicLayer("accentRight", "Accent right", width * 0.72, height * 0.53, width * 0.22, height * 0.24, "#12c8d8", 22),
    card: rectDynamicLayer("card", "Main card", width * 0.12, height * 0.16, width * 0.76, height * 0.68, "#202326", 34),
    badge: {
      ...rectDynamicLayer("badge", "Member badge", width * 0.34, height * 0.20, width * 0.32, 28, "rgba(255,255,255,0.10)", 7),
      type: "badge",
      text: "Member #{member_count}",
      textColor: "#d7dde7",
      fontSize: 14,
      fontWeight: 700,
      align: "center",
    },
    avatar: {
      id: "avatar",
      name: "User avatar",
      type: "avatar",
      visible: true,
      x: Math.round(width / 2 - 56),
      y: Math.round(height * 0.29),
      width: 112,
      height: 112,
      size: 112,
      radius: 56,
      opacity: 100,
      borderColor: "#ffffff",
      borderWidth: 8,
      imageUrl: "",
      imageFit: "cover",
    },
    title: textDynamicLayer("title", "Title", "Welcome {user_display}", width * 0.16, height * 0.64, width * 0.68, 44, "#ffffff", 34, 900, "center"),
    subtitle: textDynamicLayer("subtitle", "Subtitle", "to {server_name}", width * 0.22, height * 0.76, width * 0.56, 32, "#d7dde7", 22, 800, "center", true),
  };
}

function createCustomDynamicLayer(type, template = currentDynamicTemplate()) {
  const id = `custom_${type}_${Date.now().toString(36)}`;
  const index = (template.customLayers || []).length + 1;
  const x = Math.round(template.width * 0.25);
  const y = Math.round(template.height * 0.25);

  if (type === "rect") {
    return rectDynamicLayer(id, `Shape ${index}`, x, y, Math.round(template.width * 0.28), Math.round(template.height * 0.16), "#3158ff", 18);
  }

  if (type === "image") {
    return {
      id,
      name: `Image ${index}`,
      type: "image",
      visible: true,
      x,
      y,
      width: 180,
      height: 110,
      radius: 16,
      color: "rgba(255,255,255,0.10)",
      opacity: 100,
      imageUrl: "",
      imageFit: "cover",
      borderColor: "#ffffff",
      borderWidth: 0,
    };
  }

  return textDynamicLayer(id, `Text ${index}`, "New text", x, y, Math.round(template.width * 0.5), 42, "#ffffff", 28, 800, "center");
}

function rectDynamicLayer(id, name, x, y, width, height, color, radius) {
  return {
    id,
    name,
    type: "rect",
    visible: true,
    x: Math.round(x),
    y: Math.round(y),
    width: Math.round(width),
    height: Math.round(height),
    radius: Math.round(radius),
    color,
    opacity: 100,
  };
}

function textDynamicLayer(id, name, text, x, y, width, height, textColor, fontSize, fontWeight, align, italic = false) {
  return {
    id,
    name,
    type: "text",
    visible: true,
    x: Math.round(x),
    y: Math.round(y),
    width: Math.round(width),
    height: Math.round(height),
    text,
    textColor,
    fontSize,
    fontWeight,
    align,
    italic,
    opacity: 100,
  };
}

function migrateOldDynamicTemplate(template, width, height) {
  if (template.layers) return {};
  const layers = defaultDynamicLayers(width, height);
  layers.card.color = colorValue(template.cardColor, layers.card.color);
  layers.card.radius = clampNumber(template.borderRadius, 0, 120, layers.card.radius);
  layers.card.opacity = clampNumber(template.opacity, 0, 100, layers.card.opacity);
  layers.accentLeft.color = colorValue(template.accentColor, layers.accentLeft.color);
  layers.accentRight.color = colorValue(template.accentColor, layers.accentRight.color);
  layers.title.text = String(template.title || layers.title.text).slice(0, 140);
  layers.title.textColor = colorValue(template.textColor, layers.title.textColor);
  layers.subtitle.text = String(template.subtitle || layers.subtitle.text).slice(0, 140);
  layers.subtitle.textColor = colorValue(template.mutedColor, layers.subtitle.textColor);
  layers.badge.text = String(template.badge || layers.badge.text).slice(0, 100);
  layers.badge.textColor = colorValue(template.mutedColor, layers.badge.textColor);
  layers.avatar.size = clampNumber(template.avatarSize, 40, 260, layers.avatar.size);
  layers.avatar.width = layers.avatar.size;
  layers.avatar.height = layers.avatar.size;
  layers.avatar.radius = Math.round(layers.avatar.size / 2);
  layers.avatar.imageUrl = String(template.customLogo || "").slice(0, MAX_IMAGE_SOURCE_LENGTH);
  return {
    background: {
      color: colorValue(template.backgroundColor, "#111820"),
      imageUrl: String(template.bgImage || "").slice(0, MAX_IMAGE_SOURCE_LENGTH),
      fit: "cover",
      x: 0,
      y: 0,
      scale: 100,
      opacity: 100,
    },
    layers,
  };
}

function normalizeDynamicBackground(raw = {}, old = {}) {
  return {
    color: colorValue(raw.color || old.backgroundColor, "#111820"),
    imageUrl: String(raw.imageUrl || old.bgImage || "").slice(0, MAX_IMAGE_SOURCE_LENGTH),
    fit: ["cover", "contain", "stretch", "original"].includes(raw.fit) ? raw.fit : "cover",
    x: clampNumber(raw.x, -1200, 1200, 0),
    y: clampNumber(raw.y, -640, 640, 0),
    scale: clampNumber(raw.scale, 10, 300, 100),
    opacity: clampNumber(raw.opacity, 0, 100, 100),
  };
}

function normalizeDynamicLayers(raw = {}, width, height) {
  const fallback = defaultDynamicLayers(width, height);
  return Object.fromEntries(
    Object.entries(fallback).map(([id, base]) => [id, normalizeDynamicLayer({ ...base, ...(raw[id] || {}) }, base, width, height)]),
  );
}

function normalizeDynamicCustomLayers(raw = [], width, height) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((layer, index) => normalizeDynamicCustomLayer(layer, index, width, height))
    .filter(Boolean)
    .slice(0, 30);
}

function normalizeDynamicCustomLayer(raw = {}, index, width, height) {
  const type = ["rect", "text", "image"].includes(raw.type) ? raw.type : "text";
  const fallback = createCustomDynamicLayer(type, {
    width,
    height,
    customLayers: Array.from({ length: index }),
  });
  const layer = normalizeDynamicLayer({ ...fallback, ...raw }, fallback, width, height);
  layer.id = String(raw.id || fallback.id).replace(/[^a-z0-9_-]/gi, "") || fallback.id;
  layer.custom = true;

  if (type === "image") {
    layer.imageUrl = String(raw.imageUrl || "").slice(0, MAX_IMAGE_SOURCE_LENGTH);
    layer.color = colorValue(raw.color, fallback.color);
    layer.radius = clampNumber(raw.radius, 0, 180, fallback.radius);
    layer.borderColor = colorValue(raw.borderColor, fallback.borderColor);
    layer.borderWidth = clampNumber(raw.borderWidth, 0, 30, fallback.borderWidth);
    layer.imageFit = imageFitValue(raw.imageFit, fallback.imageFit);
  }

  return layer;
}

function normalizeDynamicLayer(raw, fallback, canvasWidth, canvasHeight) {
  const maxX = canvasWidth * 2;
  const maxY = canvasHeight * 2;
  const layer = {
    ...fallback,
    ...raw,
    id: fallback.id,
    type: fallback.type,
    name: String(raw.name || fallback.name).slice(0, 42),
    visible: raw.visible !== false,
    x: clampNumber(raw.x, -maxX, maxX, fallback.x),
    y: clampNumber(raw.y, -maxY, maxY, fallback.y),
    width: clampNumber(raw.width, 1, maxX, fallback.width),
    height: clampNumber(raw.height, 1, maxY, fallback.height),
    opacity: clampNumber(raw.opacity, 0, 100, fallback.opacity),
  };

  if (layer.type === "rect" || layer.type === "badge") {
    layer.radius = clampNumber(raw.radius, 0, 180, fallback.radius);
    layer.color = colorValue(raw.color, fallback.color);
  }

  if (layer.type === "badge" || layer.type === "text") {
    layer.text = String(raw.text || fallback.text || "").slice(0, 160);
    layer.textColor = colorValue(raw.textColor, fallback.textColor);
    layer.fontSize = clampNumber(raw.fontSize, 8, 96, fallback.fontSize);
    layer.fontWeight = clampNumber(raw.fontWeight, 100, 1000, fallback.fontWeight);
    layer.align = ["left", "center", "right"].includes(raw.align) ? raw.align : fallback.align;
    layer.italic = Boolean(raw.italic);
  }

  if (layer.type === "avatar") {
    layer.size = clampNumber(raw.size || raw.width, 32, 260, fallback.size);
    layer.width = layer.size;
    layer.height = layer.size;
    layer.radius = clampNumber(raw.radius, 0, 160, fallback.radius);
    layer.borderColor = colorValue(raw.borderColor, fallback.borderColor);
    layer.borderWidth = clampNumber(raw.borderWidth, 0, 30, fallback.borderWidth);
    layer.imageUrl = String(raw.imageUrl || "").slice(0, MAX_IMAGE_SOURCE_LENGTH);
    layer.imageFit = imageFitValue(raw.imageFit, fallback.imageFit);
  }

  return layer;
}

function renderLayerInspector(template, prefix) {
  const selected = layerDefinitions(template).some((layer) => layer.id === state.selectedLayer)
    ? state.selectedLayer
    : "avatar";
  state.selectedLayer = selected;

  return `
    <div class="setting-grid compact">
      <div class="inspector-section-title">Canvas</div>
      ${inputField("Template name", `${prefix}.name`, "text", { max: 48 })}
      <div class="field-pair">
        ${inputField("Width", `${prefix}.width`, "number", { min: 420, max: 1200 })}
        ${inputField("Height", `${prefix}.height`, "number", { min: 220, max: 640 })}
      </div>

      <div class="inspector-section-title">Background</div>
      <div class="color-grid">
        ${inputField("Color", `${prefix}.background.color`, "color")}
        ${selectField("Fit", `${prefix}.background.fit`, backgroundFitOptions(), "Cover")}
      </div>
      ${imageSourceField("Image URL", `${prefix}.background.imageUrl`)}
      <div class="field-pair">
        ${inputField("Image X", `${prefix}.background.x`, "number", { min: -1200, max: 1200 })}
        ${inputField("Image Y", `${prefix}.background.y`, "number", { min: -640, max: 640 })}
      </div>
      <div class="field-pair">
        ${inputField("Image scale", `${prefix}.background.scale`, "number", { min: 10, max: 300 })}
        ${inputField("Image opacity", `${prefix}.background.opacity`, "number", { min: 0, max: 100 })}
      </div>

      ${selected === "background" ? "" : renderSelectedLayerFields(template, prefix, selected)}
    </div>
  `;
}

function renderSelectedLayerFields(template, prefix, layerId) {
  const found = getTemplateLayer(template, layerId);
  const layer = found?.layer;
  if (!layer) return "";
  const layerPrefix = found.custom ? `${prefix}.customLayers.${found.index}` : `${prefix}.layers.${layerId}`;
  const typeLabel = layer.type === "avatar" ? "Avatar" : layer.type === "badge" ? "Badge" : layer.type === "text" ? "Text" : layer.type === "image" ? "Image" : "Shape";

  return `
    <div class="inspector-section-title">${escapeHtml(typeLabel)} Layer</div>
    <div class="layer-action-strip">
      <button class="btn small danger" type="button" data-layer-delete="${escapeAttr(layerId)}">${found.custom ? "Delete layer" : "Remove from image"}</button>
    </div>
    <div class="row-head layer-enabled-row">
      <label>Visible</label>
      ${toggleField(`${layerPrefix}.visible`)}
    </div>
    ${inputField("Layer name", `${layerPrefix}.name`, "text", { max: 42 })}
    <div class="field-pair">
      ${inputField("X", `${layerPrefix}.x`, "number", { min: -2400, max: 2400 })}
      ${inputField("Y", `${layerPrefix}.y`, "number", { min: -1280, max: 1280 })}
    </div>
    ${layer.type === "avatar" ? renderAvatarLayerFields(layerPrefix) : ""}
    ${layer.type === "image" ? renderImageLayerFields(layerPrefix) : ""}
    ${layer.type === "rect" ? renderRectLayerFields(layerPrefix) : ""}
    ${layer.type === "badge" ? renderBadgeLayerFields(layerPrefix) : ""}
    ${layer.type === "text" ? renderTextLayerFields(layerPrefix) : ""}
  `;
}

function renderAvatarLayerFields(layerPrefix) {
  return `
    <div class="field-pair">
      ${inputField("Size", `${layerPrefix}.size`, "number", { min: 32, max: 260 })}
      ${inputField("Radius", `${layerPrefix}.radius`, "number", { min: 0, max: 160 })}
    </div>
    <div class="field-pair">
      ${inputField("Border size", `${layerPrefix}.borderWidth`, "number", { min: 0, max: 30 })}
      ${inputField("Border color", `${layerPrefix}.borderColor`, "color")}
    </div>
    ${imageSourceField("Custom image", `${layerPrefix}.imageUrl`)}
    ${selectField("Image fit", `${layerPrefix}.imageFit`, imageFitOptions(), "Cover")}
  `;
}

function renderRectLayerFields(layerPrefix) {
  return `
    <div class="field-pair">
      ${inputField("Width", `${layerPrefix}.width`, "number", { min: 1, max: 2400 })}
      ${inputField("Height", `${layerPrefix}.height`, "number", { min: 1, max: 1280 })}
    </div>
    <div class="field-pair">
      ${inputField("Radius", `${layerPrefix}.radius`, "number", { min: 0, max: 180 })}
      ${inputField("Opacity", `${layerPrefix}.opacity`, "number", { min: 0, max: 100 })}
    </div>
    ${inputField("Color", `${layerPrefix}.color`, "color")}
  `;
}

function renderImageLayerFields(layerPrefix) {
  return `
    <div class="field-pair">
      ${inputField("Width", `${layerPrefix}.width`, "number", { min: 1, max: 2400 })}
      ${inputField("Height", `${layerPrefix}.height`, "number", { min: 1, max: 1280 })}
    </div>
    <div class="field-pair">
      ${inputField("Radius", `${layerPrefix}.radius`, "number", { min: 0, max: 180 })}
      ${inputField("Opacity", `${layerPrefix}.opacity`, "number", { min: 0, max: 100 })}
    </div>
    ${imageSourceField("Image", `${layerPrefix}.imageUrl`)}
    ${selectField("Image fit", `${layerPrefix}.imageFit`, imageFitOptions(), "Cover")}
    <div class="color-grid">
      ${inputField("Fallback color", `${layerPrefix}.color`, "text", { max: 40 })}
      ${inputField("Border color", `${layerPrefix}.borderColor`, "color")}
    </div>
    ${inputField("Border size", `${layerPrefix}.borderWidth`, "number", { min: 0, max: 30 })}
  `;
}

function renderBadgeLayerFields(layerPrefix) {
  return `
    <div class="field-pair">
      ${inputField("Width", `${layerPrefix}.width`, "number", { min: 1, max: 2400 })}
      ${inputField("Height", `${layerPrefix}.height`, "number", { min: 1, max: 1280 })}
    </div>
    <div class="field-pair">
      ${inputField("Radius", `${layerPrefix}.radius`, "number", { min: 0, max: 180 })}
      ${inputField("Opacity", `${layerPrefix}.opacity`, "number", { min: 0, max: 100 })}
    </div>
    ${inputField("Text", `${layerPrefix}.text`, "text", { max: 160 })}
    <div class="field-pair">
      ${inputField("Font size", `${layerPrefix}.fontSize`, "number", { min: 8, max: 96 })}
      ${selectField("Align", `${layerPrefix}.align`, alignOptions(), "Center")}
    </div>
    <div class="color-grid">
      ${inputField("Box color", `${layerPrefix}.color`, "text", { max: 40 })}
      ${inputField("Text color", `${layerPrefix}.textColor`, "color")}
    </div>
  `;
}

function renderTextLayerFields(layerPrefix) {
  return `
    <div class="field-pair">
      ${inputField("Width", `${layerPrefix}.width`, "number", { min: 1, max: 2400 })}
      ${inputField("Height", `${layerPrefix}.height`, "number", { min: 1, max: 1280 })}
    </div>
    ${inputField("Text", `${layerPrefix}.text`, "text", { max: 160 })}
    <div class="field-pair">
      ${inputField("Font size", `${layerPrefix}.fontSize`, "number", { min: 8, max: 96 })}
      ${inputField("Font weight", `${layerPrefix}.fontWeight`, "number", { min: 100, max: 1000 })}
    </div>
    <div class="field-pair">
      ${selectField("Align", `${layerPrefix}.align`, alignOptions(), "Center")}
      ${inputField("Opacity", `${layerPrefix}.opacity`, "number", { min: 0, max: 100 })}
    </div>
    <div class="row-head layer-enabled-row">
      <label>Italic</label>
      ${toggleField(`${layerPrefix}.italic`)}
    </div>
    ${inputField("Text color", `${layerPrefix}.textColor`, "color")}
  `;
}

function layerDefinitions(template = currentDynamicTemplate()) {
  const builtIns = [
    { id: "background", label: "Background" },
    { id: "accentLeft", label: template.layers?.accentLeft?.name || "Accent left", hidden: template.layers?.accentLeft?.visible === false },
    { id: "accentRight", label: template.layers?.accentRight?.name || "Accent right", hidden: template.layers?.accentRight?.visible === false },
    { id: "card", label: template.layers?.card?.name || "Main card", hidden: template.layers?.card?.visible === false },
    { id: "badge", label: template.layers?.badge?.name || "Badge", hidden: template.layers?.badge?.visible === false },
    { id: "avatar", label: template.layers?.avatar?.name || "User avatar", hidden: template.layers?.avatar?.visible === false },
    { id: "title", label: template.layers?.title?.name || "Title", hidden: template.layers?.title?.visible === false },
    { id: "subtitle", label: template.layers?.subtitle?.name || "Subtitle", hidden: template.layers?.subtitle?.visible === false },
  ];
  const custom = (template.customLayers || []).map((layer) => ({
    id: layer.id,
    label: layer.name || layer.id,
    custom: true,
    hidden: layer.visible === false,
  }));
  return [...builtIns, ...custom];
}

function backgroundFitOptions() {
  return [
    { id: "cover", label: "Cover" },
    { id: "contain", label: "Contain" },
    { id: "stretch", label: "Stretch" },
    { id: "original", label: "Original" },
  ];
}

function imageFitOptions() {
  return [
    { id: "cover", label: "Cover" },
    { id: "contain", label: "Contain" },
    { id: "stretch", label: "Stretch" },
  ];
}

function imageFitValue(value, fallback = "cover") {
  return ["cover", "contain", "stretch"].includes(value) ? value : fallback || "cover";
}

function imagePreserveAspect(fit) {
  if (fit === "stretch") return "none";
  if (fit === "contain") return "xMidYMid meet";
  return "xMidYMid slice";
}

function alignOptions() {
  return [
    { id: "center", label: "Center" },
    { id: "left", label: "Left" },
    { id: "right", label: "Right" },
  ];
}

function textX(layer) {
  if (layer.align === "left") return layer.x;
  if (layer.align === "right") return layer.x + layer.width;
  return layer.x + layer.width / 2;
}

function textAnchor(align) {
  if (align === "left") return "start";
  if (align === "right") return "end";
  return "middle";
}

function getTemplateLayer(template, layerId) {
  if (template.layers?.[layerId]) {
    return { layer: template.layers[layerId], custom: false, index: -1 };
  }
  const index = (template.customLayers || []).findIndex((layer) => layer.id === layerId);
  if (index >= 0) {
    return { layer: template.customLayers[index], custom: true, index };
  }
  return null;
}

function getMutableTemplateLayer(template, layerId) {
  if (template.layers?.[layerId]) return template.layers[layerId];
  return (template.customLayers || []).find((layer) => layer.id === layerId) || null;
}

function removeTemplateLayer(template, layerId) {
  const customIndex = (template.customLayers || []).findIndex((layer) => layer.id === layerId);
  if (customIndex >= 0) {
    template.customLayers.splice(customIndex, 1);
    return true;
  }
  if (template.layers?.[layerId]) {
    template.layers[layerId].visible = false;
    return true;
  }
  return false;
}

function bindGlobalActions() {
  app.querySelector("[data-guild-menu-toggle]")?.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleGuildMenu();
  });

  app.querySelectorAll("[data-guild-option]").forEach((button) => {
    button.addEventListener("click", () => {
      const guildId = button.dataset.guildOption;
      const guild = state.guilds.find((item) => item.id === guildId);
      if (!guildId || guildId === state.guildId) {
        closeGuildMenu();
        return;
      }

      if (guild && !guild.installed) {
        closeGuildMenu();
        if (guild.inviteUrl) location.href = guild.inviteUrl;
        return;
      }

      if (state.dirty && !confirm("Discard unsaved changes and switch server?")) {
        closeGuildMenu();
        return;
      }

      closeGuildMenu();
      loadGuild(guildId);
    });
  });

  app.querySelector(".app-shell")?.addEventListener("click", (event) => {
    if (!event.target.closest("[data-guild-picker]")) closeGuildMenu();
  });

  app.querySelector("[data-refresh]")?.addEventListener("click", () => loadGuild(state.guildId));
  app.querySelector("[data-logout]")?.addEventListener("click", logout);
  app.querySelector("[data-save]")?.addEventListener("click", saveSettings);
  app.querySelector("[data-reset]")?.addEventListener("click", resetDraft);
  app.querySelector("[data-server-search]")?.addEventListener("input", filterServerCards);
  app.querySelectorAll("[data-server-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      app.querySelectorAll("[data-server-filter]").forEach((item) => {
        item.classList.toggle("primary", item === button);
        item.classList.toggle("ghost", item !== button);
      });
      filterServerCards();
    });
  });
  app.querySelectorAll("[data-welcome-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      state.welcomeTab = button.dataset.welcomeTab || "messages";
      localStorage.setItem("dsc:welcomeTab", state.welcomeTab);
      renderShell();
    });
  });
  app.querySelectorAll("[data-dynamic-select]").forEach((button) => {
    button.addEventListener("click", () => {
      state.dynamicImageIndex = Number(button.dataset.dynamicSelect || 0);
      localStorage.setItem("dsc:dynamicImageIndex", String(state.dynamicImageIndex));
      renderShell();
      requestAnimationFrame(() => {
        app.querySelector("[data-dynamic-preview]")?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    });
  });
  app.querySelector("[data-dynamic-new]")?.addEventListener("click", () => {
    const dynamic = state.draft.welcome.dynamicImages;
    if ((dynamic.templates || []).length >= 3) return;
    const id = `image-${Date.now().toString(36)}`;
    dynamic.templates.push({
      ...defaultDynamicTemplate(id),
      name: `Welcome card ${dynamic.templates.length + 1}`,
    });
    state.dynamicImageIndex = dynamic.templates.length - 1;
    localStorage.setItem("dsc:dynamicImageIndex", String(state.dynamicImageIndex));
    markDirty();
    renderShell();
  });
  app.querySelectorAll("[data-dynamic-delete]").forEach((button) => {
    button.addEventListener("click", () => {
      const dynamic = state.draft.welcome.dynamicImages;
      const index = Number(button.dataset.dynamicDelete || 0);
      if (!Array.isArray(dynamic.templates) || dynamic.templates.length <= 1) return;
      const [removed] = dynamic.templates.splice(index, 1);
      if (removed?.id === dynamic.attachedId) {
        dynamic.attachedId = dynamic.templates[0]?.id || "default";
        dynamic.enabled = false;
      }
      state.dynamicImageIndex = clampIndex(Math.min(index, dynamic.templates.length - 1), dynamic.templates.length);
      localStorage.setItem("dsc:dynamicImageIndex", String(state.dynamicImageIndex));
      markDirty();
      renderShell();
    });
  });
  app.querySelectorAll("[data-dynamic-attach]").forEach((button) => {
    button.addEventListener("click", () => {
      const dynamic = state.draft.welcome.dynamicImages;
      const index = Number(button.dataset.dynamicAttach || 0);
      const template = dynamic.templates?.[index];
      if (!template) return;
      dynamic.attachedId = template.id;
      dynamic.enabled = true;
      state.dynamicImageIndex = index;
      localStorage.setItem("dsc:dynamicImageIndex", String(state.dynamicImageIndex));
      markDirty();
      renderShell();
    });
  });
  app.querySelectorAll("[data-layer-select]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedLayer = button.dataset.layerSelect;
      localStorage.setItem("dsc:selectedLayer", state.selectedLayer);
      renderShell();
    });
  });
  app.querySelectorAll("[data-layer-add]").forEach((button) => {
    button.addEventListener("click", () => {
      const template = currentDynamicTemplate();
      const type = button.dataset.layerAdd || "text";
      template.customLayers ||= [];
      if (template.customLayers.length >= 30) {
        toast("Maximum 30 custom layers", "bad");
        return;
      }
      const layer = createCustomDynamicLayer(type, template);
      template.customLayers.push(layer);
      state.selectedLayer = layer.id;
      localStorage.setItem("dsc:selectedLayer", state.selectedLayer);
      markDirty();
      renderShell();
    });
  });
  app.querySelector("[data-layer-delete]")?.addEventListener("click", (event) => {
    const layerId = event.currentTarget.dataset.layerDelete;
    const template = currentDynamicTemplate();
    if (!layerId || layerId === "background") return;
    if (!removeTemplateLayer(template, layerId)) return;
    state.selectedLayer = "avatar";
    localStorage.setItem("dsc:selectedLayer", state.selectedLayer);
    markDirty();
    renderShell();
  });
  bindImageSourceFields();
  bindDynamicEditorDrag();
  bindAvatarImages();
  bindWheelPassthrough();

  // Bind advanced logging events
  app.querySelectorAll("[data-logging-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      state.loggingTab = button.dataset.loggingTab || "channels";
      localStorage.setItem("dsc:loggingTab", state.loggingTab);
      renderShell();
    });
  });

  app.querySelectorAll("[data-verify-thread]").forEach((button) => {
    button.addEventListener("click", async () => {
      const eventKey = button.dataset.verifyThread;
      try {
        const res = await api(`/api/guilds/${state.guildId}/verify-log-token`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ eventKey })
        });
        if (res.token) {
          state.activeVerification = { token: res.token, eventKey };
          renderShell();
        }
      } catch (err) {
        alert("Failed to generate token: " + err.message);
      }
    });
  });

  app.querySelector("[data-close-verification]")?.addEventListener("click", () => {
    state.activeVerification = null;
    renderShell();
  });

  app.querySelector("[data-refresh-logging]")?.addEventListener("click", async () => {
    state.activeVerification = null;
    await loadGuild(state.guildId);
  });

  app.querySelector("[data-copy-verification-token]")?.addEventListener("click", () => {
    if (state.activeVerification) {
      navigator.clipboard.writeText(`!verify-log ${state.activeVerification.token}`);
      const btn = app.querySelector("[data-copy-verification-token]");
      if (btn) {
        btn.textContent = "Copied!";
        setTimeout(() => { btn.textContent = "Copy"; }, 2000);
      }
    }
  });

  // Category mass select handler
  app.querySelectorAll("[data-category-mass-select]").forEach((select) => {
    select.addEventListener("change", () => {
      const channelId = select.value;
      const catId = select.dataset.categoryMassSelect;
      const categories = {
        messages: ["messageDelete", "messageUpdate"],
        channels: ["channelCreate", "channelDelete", "channelUpdate"],
        roles: ["roleCreate", "roleDelete", "roleUpdate"],
        members: ["guildMemberAdd", "guildMemberRemove", "guildMemberUpdate"],
        voice: ["voiceStateUpdate"],
        threads: ["threadCreate", "threadDelete", "threadUpdate", "threadMemberUpdate"],
        invites: ["inviteCreate", "inviteDelete", "webhookUpdate"],
        server: ["guildUpdate"],
        moderation: ["guildBanAdd", "guildBanRemove", "guildMemberKick", "guildMemberTimeout", "messageDeleteBulk"]
      };

      const keys = categories[catId];
      if (keys) {
        keys.forEach(key => {
          setPath(state.draft, `logging.eventChannels.${key}`, channelId);
        });
        markDirty();
        renderShell();
      }
    });
  });

  // Bind sidebar module toggles
  app.querySelectorAll("[data-sidebar-toggle]").forEach((toggle) => {
    toggle.addEventListener("click", (event) => {
      event.stopPropagation();
      const path = toggle.dataset.sidebarToggle;
      const on = toggle.classList.contains("checked");
      const nextState = !on;
      
      if (path === "automod.any") {
        setPath(state.draft, "automod.antilink.isEnabled", nextState);
        setPath(state.draft, "automod.antispam.isEnabled", nextState);
      } else {
        setPath(state.draft, path, nextState);
      }
      
      markDirty();
      renderShell();
    });
  });

  // Bind Home overview page card toggles
  app.querySelectorAll("[data-card-toggle]").forEach((toggle) => {
    toggle.addEventListener("change", () => {
      const path = toggle.dataset.cardToggle;
      const checked = toggle.checked;
      
      if (path === "automod.any") {
        setPath(state.draft, "automod.antilink.isEnabled", checked);
        setPath(state.draft, "automod.antispam.isEnabled", checked);
      } else {
        setPath(state.draft, path, checked);
      }
      
      markDirty();
      renderShell();
    });
  });
}

function filterServerCards() {
  const query = String(app.querySelector("[data-server-search]")?.value || "").trim().toLowerCase();
  const activeFilter = app.querySelector("[data-server-filter].primary")?.dataset.serverFilter || "all";
  let shown = 0;

  app.querySelectorAll("[data-server-card]").forEach((card) => {
    const name = card.dataset.serverName || "";
    const status = card.dataset.serverStatus || "";
    const matchesQuery = !query || name.includes(query);
    const matchesFilter = activeFilter === "all" || status === activeFilter;
    const visible = matchesQuery && matchesFilter;
    card.hidden = !visible;
    if (visible) shown += 1;
  });

  const empty = app.querySelector("[data-server-empty]");
  if (empty) empty.hidden = shown > 0;
}

function startLiveRefresh() {
  if (liveRefreshStarted) return;
  liveRefreshStarted = true;

  window.addEventListener("focus", () => refreshCurrentGuild());
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) refreshCurrentGuild();
  });
  setInterval(() => refreshCurrentGuild(), 45000);
}

async function refreshCurrentGuild() {
  if (!state.guildId || state.dirty || state.saving || state.refreshing || document.hidden) return;
  state.refreshing = true;
  const scrollY = window.scrollY;

  try {
    const payload = await api(`/api/guilds/${state.guildId}`);
    applyGuildPayload(payload);
    renderShell();
    requestAnimationFrame(() => {
      window.scrollTo({ top: scrollY, left: 0, behavior: "auto" });
    });
  } catch {
    // Background refresh should never interrupt edits or navigation.
  } finally {
    state.refreshing = false;
  }
}

function toggleGuildMenu() {
  const picker = app.querySelector("[data-guild-picker]");
  const button = app.querySelector("[data-guild-menu-toggle]");
  const isOpen = picker?.classList.toggle("open");
  button?.setAttribute("aria-expanded", isOpen ? "true" : "false");
}

function closeGuildMenu() {
  app.querySelector("[data-guild-picker]")?.classList.remove("open");
  app.querySelector("[data-guild-menu-toggle]")?.setAttribute("aria-expanded", "false");
}

function bindSidebar() {
  app.querySelectorAll("[data-nav]").forEach((button) => {
    button.addEventListener("click", () => {
      state.page = button.dataset.nav;
      localStorage.setItem("dsc:page", state.page);
      renderShell();
    });
  });
}

function bindFields() {
  app.querySelectorAll("[data-bind]").forEach((field) => {
    const eventName = field.tagName === "TEXTAREA" || field.tagName === "INPUT" ? "input" : "change";
    field.addEventListener(eventName, () => {
      const path = field.dataset.bind;
      let value;

      if (field.type === "checkbox") {
        value = field.checked;
      } else if (field.dataset.multi === "true") {
        value = Array.from(field.selectedOptions).map((option) => option.value).filter(Boolean);
      } else if (field.dataset.lines === "true") {
        value = field.value.split(/\s+/).map((item) => item.trim()).filter(Boolean);
      } else if (field.type === "number") {
        value = Number(field.value);
      } else {
        value = field.value;
      }

      setPath(state.draft, path, value);
      markDirty();
      if (path.startsWith("welcome.dynamicImages.")) updateDynamicImagePreview();
      if (path.startsWith("welcome.")) updateWelcomePreview();

      const masterPaths = [
        "music247.enabled",
        "premium.leveling.enabled",
        "premium.vcGuard.enabled",
        "premium.sticky.enabled",
        "automod.antilink.isEnabled",
        "automod.antispam.isEnabled",
        "antinuke.isEnabled",
        "welcome.enabled"
      ];
      if (masterPaths.includes(path)) {
        renderShell();
      }
    });
  });

  app.querySelectorAll("[data-multi-check]").forEach((field) => {
    field.addEventListener("change", () => {
      const path = field.dataset.multiCheck;
      const values = Array.from(app.querySelectorAll("[data-multi-check]"))
        .filter((input) => input.dataset.multiCheck === path && input.checked)
        .map((input) => input.value)
        .filter(Boolean);
      setPath(state.draft, path, values);
      markDirty();
    });
  });

  // data-event-toggle: inverted membership — checked means NOT in disabledEvents
  app.querySelectorAll("[data-event-toggle]").forEach((field) => {
    field.addEventListener("change", () => {
      const path = field.dataset.eventToggle;   // e.g. "antinuke.disabledEvents"
      const key  = field.dataset.eventKey;      // e.g. "antiBan"
      const current = new Set(getPath(state.draft, path) || []);
      if (field.checked) {
        current.delete(key);   // enabled → remove from disabled list
      } else {
        current.add(key);      // disabled → add to disabled list
      }
      setPath(state.draft, path, Array.from(current));
      markDirty();
    });
  });
}

function bindImageSourceFields() {
  app.querySelectorAll("[data-image-url-input]").forEach((input) => {
    input.addEventListener("focus", () => {
      const path = input.dataset.imageUrlInput;
      if (isDataImageSource(getPath(state.draft, path))) input.select();
    });

    input.addEventListener("input", () => {
      const path = input.dataset.imageUrlInput;
      if (!path) return;
      if (input.value === "Uploaded local image" && isDataImageSource(getPath(state.draft, path))) return;
      setPath(state.draft, path, input.value.trim());
      markDirty();
      if (path.startsWith("welcome.dynamicImages.")) updateDynamicImagePreview();
      if (path.startsWith("welcome.")) updateWelcomePreview();
    });
  });

  app.querySelectorAll("[data-image-upload]").forEach((button) => {
    button.addEventListener("click", () => {
      const path = button.dataset.imageUpload;
      app.querySelector(`[data-image-file="${cssEscape(path)}"]`)?.click();
    });
  });

  app.querySelectorAll("[data-image-clear]").forEach((button) => {
    button.addEventListener("click", () => {
      const path = button.dataset.imageClear;
      if (!path) return;
      setPath(state.draft, path, "");
      markDirty();
      renderShell();
    });
  });

  app.querySelectorAll("[data-image-file]").forEach((input) => {
    input.addEventListener("change", async () => {
      const path = input.dataset.imageFile;
      const file = input.files?.[0];
      input.value = "";
      if (!path || !file) return;

      if (!file.type.startsWith("image/")) {
        toast("Choose an image file", "bad");
        return;
      }

      if (file.size > MAX_LOCAL_IMAGE_BYTES) {
        toast("Image too large. Use 3 MB or less.", "bad");
        return;
      }

      try {
        const dataUrl = await readFileAsDataUrl(file);
        setPath(state.draft, path, dataUrl);
        markDirty();
        toast("Image uploaded into template", "good");
        renderShell();
      } catch {
        toast("Could not read image file", "bad");
      }
    });
  });
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(String(reader.result || "")));
    reader.addEventListener("error", reject);
    reader.readAsDataURL(file);
  });
}

function bindDynamicEditorDrag() {
  const svg = app.querySelector("[data-dynamic-preview] [data-dynamic-svg]");
  if (!svg || svg.dataset.dragBound === "true") return;
  svg.dataset.dragBound = "true";

  svg.addEventListener("pointerdown", (event) => {
    const handle = event.target.closest("[data-dynamic-resize]");
    const layerNode = event.target.closest("[data-dynamic-layer]");
    const layerId = handle?.dataset.dynamicResize || layerNode?.dataset.dynamicLayer;
    if (!layerId) return;

    event.preventDefault();
    state.selectedLayer = layerId;
    localStorage.setItem("dsc:selectedLayer", layerId);

    const template = currentDynamicTemplate();
    const inverse = svg.getScreenCTM()?.inverse();
    if (!inverse) return;

    const startPoint = pointerToSvgPoint(event, inverse);
    const start = layerId === "background"
      ? { ...template.background }
      : { ...getMutableTemplateLayer(template, layerId) };
    const isResize = Boolean(handle);

    const onMove = (moveEvent) => {
      const point = pointerToSvgPoint(moveEvent, inverse);
      const dx = Math.round(point.x - startPoint.x);
      const dy = Math.round(point.y - startPoint.y);

      if (layerId === "background") {
        template.background.x = clampNumber(start.x + dx, -1200, 1200, 0);
        template.background.y = clampNumber(start.y + dy, -640, 640, 0);
      } else {
        const layer = getMutableTemplateLayer(template, layerId);
        if (!layer) return;

        if (isResize) {
          if (layer.type === "avatar") {
            const size = clampNumber((start.size || start.width) + Math.max(dx, dy), 32, 260, start.size || start.width);
            layer.size = size;
            layer.width = size;
            layer.height = size;
          } else {
            layer.width = clampNumber(start.width + dx, 1, template.width * 2, start.width);
            layer.height = clampNumber(start.height + dy, 1, template.height * 2, start.height);
          }
        } else {
          layer.x = clampNumber(start.x + dx, -template.width * 2, template.width * 2, start.x);
          layer.y = clampNumber(start.y + dy, -template.height * 2, template.height * 2, start.y);
        }
      }

      markDirty();
      updateDynamicImagePreview();
      updateWelcomePreview();
      syncDynamicInspectorInputs();
    };

    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      renderShell();
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp, { once: true });
  });
}

function pointerToSvgPoint(event, inverse) {
  return new DOMPoint(event.clientX, event.clientY).matrixTransform(inverse);
}

function syncDynamicInspectorInputs() {
  const prefix = `welcome.dynamicImages.templates.${state.dynamicImageIndex}`;
  const template = currentDynamicTemplate();
  const values = {
    [`${prefix}.background.x`]: template.background.x,
    [`${prefix}.background.y`]: template.background.y,
  };
  for (const [id, layer] of Object.entries(template.layers || {})) {
    values[`${prefix}.layers.${id}.x`] = layer.x;
    values[`${prefix}.layers.${id}.y`] = layer.y;
    values[`${prefix}.layers.${id}.width`] = layer.width;
    values[`${prefix}.layers.${id}.height`] = layer.height;
    values[`${prefix}.layers.${id}.size`] = layer.size;
  }
  (template.customLayers || []).forEach((layer, index) => {
    values[`${prefix}.customLayers.${index}.x`] = layer.x;
    values[`${prefix}.customLayers.${index}.y`] = layer.y;
    values[`${prefix}.customLayers.${index}.width`] = layer.width;
    values[`${prefix}.customLayers.${index}.height`] = layer.height;
  });

  for (const [path, value] of Object.entries(values)) {
    const input = app.querySelector(`[data-bind="${cssEscape(path)}"]`);
    if (input && value !== undefined) input.value = value;
  }
}

function bindWheelPassthrough() {
  app.querySelectorAll(".select, .textarea, .check-list").forEach((field) => {
    field.addEventListener(
      "wheel",
      (event) => {
        const canScrollInside = field.scrollHeight > field.clientHeight;
        const atTop = field.scrollTop <= 0;
        const atBottom = Math.ceil(field.scrollTop + field.clientHeight) >= field.scrollHeight;
        const wantsUp = event.deltaY < 0;
        const wantsDown = event.deltaY > 0;
        if (!canScrollInside || field.matches(".select, .textarea") || (wantsUp && atTop) || (wantsDown && atBottom)) {
          window.scrollBy({ left: event.deltaX || 0, top: event.deltaY || 0, behavior: "auto" });
          event.preventDefault();
        }
      },
      { passive: false },
    );
  });
}

function bindAvatarImages() {
  app.querySelectorAll(".avatar-surface img").forEach((image) => {
    const frame = image.closest(".avatar-surface");
    if (!frame) return;
    if (image.dataset.bound === "true") return;
    image.dataset.bound = "true";

    const candidates = parseAvatarCandidates(image.dataset.avatarCandidates);
    let index = Math.max(0, candidates.indexOf(image.getAttribute("src")));

    const showImage = () => {
      if (image.naturalWidth > 0) frame.classList.add("loaded");
    };

    const tryNextImage = () => {
      frame.classList.remove("loaded");
      index += 1;
      if (index < candidates.length) {
        image.src = candidates[index];
        return;
      }
      image.remove();
    };

    if (image.complete) {
      if (image.naturalWidth > 0) {
        showImage();
      } else {
        tryNextImage();
      }
      return;
    }

    image.addEventListener("load", showImage);
    image.addEventListener("error", tryNextImage);
  });
}

async function saveSettings() {
  if (!state.dirty || state.saving) return;
  state.saving = true;
  updateSavebar();

  try {
    const payload = await api(`/api/guilds/${state.guildId}/settings`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(state.draft),
    });
    applyGuildPayload(payload);
    state.dirty = false;
    toast("Saved dashboard settings", "good");
    renderShell();
  } catch (error) {
    toast(error.message || "Save failed", "bad");
  } finally {
    state.saving = false;
    updateSavebar();
  }
}

function resetDraft() {
  state.draft = clone(state.data.settings);
  state.dirty = false;
  renderShell();
}

async function logout() {
  await fetch("/logout", { method: "POST" }).catch(() => null);
  location.reload();
}

function markDirty() {
  state.dirty = JSON.stringify(state.draft) !== JSON.stringify(state.data.settings);
  updateSavebar();
}

function updateSavebar() {
  const savebar = app.querySelector("[data-savebar]");
  if (!savebar) return;
  savebar.classList.toggle("show", state.dirty);
  const save = savebar.querySelector("[data-save]");
  const reset = savebar.querySelector("[data-reset]");
  if (save) {
    save.disabled = state.saving;
    save.textContent = state.saving ? "Saving..." : "Save changes";
  }
  if (reset) reset.disabled = state.saving;
}

function applyGuildPayload(payload) {
  if (payload.guild && payload.settings) {
    state.data = payload;
  } else if (payload.settings) {
    state.data.settings = payload.settings;
  }
  state.draft = clone(state.data.settings);
  ensureDraftShape();
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    credentials: "same-origin",
    ...options,
  });

  if (response.status === 401) {
    throw new Error("Not logged in");
  }

  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(json.error || `Request failed (${response.status})`);
  }
  return json;
}

function textChannels() {
  const channels = state.data?.channels || [];
  return channels
    .filter((channel) => {
      if (channel.type === 0 || channel.type === 5 || channel.type === 15) return true;
      if (channel.type === 10 || channel.type === 11 || channel.type === 12) {
        const parent = channels.find(c => c.id === channel.parentId);
        if (parent && parent.type === 15) {
          return false;
        }
        return true;
      }
      return false;
    })
    .map((ch) => {
      let prefix = "# ";
      let suffix = "";
      if (ch.type === 5) {
        prefix = "📢 ";
        suffix = " (Announcement)";
      } else if (ch.type === 15) {
        prefix = "📁 ";
        suffix = " (Forum)";
      } else if (ch.type === 10 || ch.type === 11 || ch.type === 12) {
        prefix = "🧵 ";
        suffix = " (Thread)";
      }
      return {
        ...ch,
        label: `${prefix}${ch.name}${suffix}`,
        name: `${prefix}${ch.name}${suffix}`
      };
    });
}

function voiceChannels() {
  return (state.data?.channels || [])
    .filter((channel) => channel.type === 2 || channel.type === 13)
    .map((ch) => {
      const prefix = ch.type === 13 ? "🎤 " : "🔊 ";
      const suffix = ch.type === 13 ? " (Stage)" : " (Voice)";
      return {
        ...ch,
        label: `${prefix}${ch.name}${suffix}`,
        name: `${prefix}${ch.name}${suffix}`
      };
    });
}

function statusFor(path) {
  if (!state.draft) return false;
  if (path === "premium.active") {
    return Boolean(state.data?.premium?.active);
  }
  if (path === "automod.any") {
    return Boolean(state.draft.automod?.antilink?.isEnabled || state.draft.automod?.antispam?.isEnabled);
  }
  if (path === "roles.any") {
    const roles = state.draft.roles || {};
    const autorole = state.draft.autorole || {};
    return Object.values(roles).some(Boolean)
      || Boolean(state.draft.voiceRole?.roleId)
      || Boolean(autorole.humanRoles?.length || autorole.botRoles?.length);
  }
  return Boolean(getPath(state.draft, path));
}

function replaceVars(text, guild) {
  return String(text || "")
    .replaceAll("{user}", "@NewMember")
    .replaceAll("{server_name}", guild.name)
    .replaceAll("{member_count}", String(guild.memberCount || 0));
}

function groupBy(items, key) {
  return items.reduce((acc, item) => {
    const group = item[key] || "Other";
    acc[group] ||= [];
    acc[group].push(item);
    return acc;
  }, {});
}

function getPath(object, path) {
  return path.split(".").reduce((current, key) => current?.[key], object);
}

function setPath(object, path, value) {
  const keys = path.split(".");
  const last = keys.pop();
  const target = keys.reduce((current, key) => {
    current[key] ||= {};
    return current[key];
  }, object);
  target[last] = value;
}

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, Math.round(number)));
}

function clampIndex(index, length) {
  if (!length) return 0;
  const number = Number(index);
  if (!Number.isFinite(number)) return 0;
  return Math.min(length - 1, Math.max(0, Math.round(number)));
}

function colorValue(value, fallback) {
  const text = String(value || "").trim();
  if (/^#[0-9a-f]{6}$/i.test(text)) return text;
  if (/^rgba?\(/i.test(text)) return text;
  return fallback;
}

function isDataImageSource(value) {
  return /^data:image\/(?:png|jpe?g|webp|gif);base64,/i.test(String(value || ""));
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function ensureDraftShape() {
  state.draft.premium ||= {};
  state.draft.premium.branding ||= {
    enabled: false,
    nickname: "",
  };
  state.draft.premium.leveling ||= {
    enabled: false,
    chatEnabled: true,
    voiceEnabled: true,
    announceChannelId: "",
    levelUpMessage: "{user} reached level {level}.",
    chatXpMin: 8,
    chatXpMax: 16,
    chatCooldownSeconds: 45,
    voiceXpPerMinute: 4,
  };
  state.draft.premium.vcGuard ||= {
    enabled: false,
    protectedChannels: [],
    bypassRoles: [],
    logChannelId: "",
    action: "disconnect",
    message: "You are not allowed to join this protected voice channel.",
  };
  state.draft.premium.sticky ||= { enabled: false, messages: [] };
  if (!Array.isArray(state.draft.premium.sticky.messages)) {
    state.draft.premium.sticky.messages = [];
  }
  if (!state.draft.premium.sticky.messages.length) {
    state.draft.premium.sticky.messages.push({
      channelId: "",
      content: "",
      lastMessageId: "",
      cooldownSeconds: 20,
    });
  }
  state.draft.welcome ||= {};
  state.draft.welcome.embed ||= {};
  state.draft.welcome.embed.enabled = Boolean(state.draft.welcome.embed.enabled);
  state.draft.welcome.dynamicImages ||= {};
  const dynamic = state.draft.welcome.dynamicImages;
  dynamic.enabled = Boolean(dynamic.enabled);
  if (!Array.isArray(dynamic.templates)) dynamic.templates = [];
  if (!dynamic.templates.length) dynamic.templates.push(defaultDynamicTemplate("default"));
  dynamic.templates = dynamic.templates.slice(0, 3).map((template, index) => normalizeDynamicTemplate({
    ...defaultDynamicTemplate(index === 0 ? "default" : `image-${index + 1}`),
    ...template,
  }));
  if (!dynamic.templates.some((template) => template.id === dynamic.attachedId)) {
    dynamic.attachedId = dynamic.templates[0]?.id || "default";
  }
  state.dynamicImageIndex = clampIndex(state.dynamicImageIndex, dynamic.templates.length);

  state.draft.logging ||= {};
  state.draft.logging.isEnabled = Boolean(state.draft.logging.isEnabled);
  state.draft.logging.eventChannels ||= {};
  state.draft.logging.ignoredChannels ||= [];
  state.draft.logging.ignoredRoles ||= [];
  state.draft.logging.ignoredUsers ||= [];
  state.draft.logging.ignoreEmbeds = Boolean(state.draft.logging.ignoreEmbeds);
  state.draft.logging.ignorePolls = Boolean(state.draft.logging.ignorePolls);
  state.draft.logging.ignoreSticky = Boolean(state.draft.logging.ignoreSticky);
  state.draft.logging.applyIgnoreToVoice = Boolean(state.draft.logging.applyIgnoreToVoice);
}

function initial(text) {
  return escapeHtml(String(text || "A").trim().charAt(0).toUpperCase() || "A");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(value) {
  return escapeHtml(value);
}

function cssEscape(value) {
  if (window.CSS?.escape) return CSS.escape(value);
  return String(value).replaceAll("\\", "\\\\").replaceAll('"', '\\"');
}

function avatarSources(...sources) {
  return [...new Set(sources.flatMap((source) => {
    if (!source) return [];
    return Array.isArray(source) ? source : [source];
  }).filter(Boolean))];
}

function parseAvatarCandidates(value) {
  try {
    const parsed = JSON.parse(value || "[]");
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return [];
  }
}

function avatarImage(source, label, className) {
  const letter = String(label || "A").trim().charAt(0).toUpperCase() || "A";
  const candidates = avatarSources(source);
  const image = candidates.length
    ? `<img src="${escapeAttr(candidates[0])}" data-avatar-candidates="${escapeAttr(JSON.stringify(candidates))}" alt="" decoding="async" referrerpolicy="no-referrer">`
    : "";
  return `<span class="${className} avatar-surface" aria-hidden="true"><span class="avatar-letter">${escapeHtml(letter)}</span>${image}</span>`;
}

function toast(message, type = "") {
  const existing = document.querySelector(".toast");
  existing?.remove();
  const node = document.createElement("div");
  node.className = `toast ${type}`;
  node.textContent = message;
  document.body.appendChild(node);
  setTimeout(() => node.remove(), 3600);
}
