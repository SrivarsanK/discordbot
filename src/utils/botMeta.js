/** @format */

function getInviteUrl(client) {
  const clientId = client.config?.clientId || client.user?.id;
  if (!clientId) return null;

  return `https://discord.com/oauth2/authorize?client_id=${clientId}&permissions=${client.config?.invitePermissions}&scope=bot%20applications.commands`;
}

function getVoteUrl(client) {
  const botId = client.config?.topggBotId || client.user?.id;
  if (!botId) return null;

  return `https://top.gg/bot/${botId}/vote`;
}

function getBrandText(client) {
  return client.config?.app?.name || client.user?.username || "";
}

function getFooterText(client) {
  return client.config?.footerText || "";
}

function trackLink(track, fallbackTitle = "Unknown track") {
  const title = track?.title || fallbackTitle;
  const uri = track?.uri || track?.url;
  return uri ? `[${title}](${uri})` : `**${title}**`;
}

module.exports = {
  getBrandText,
  getFooterText,
  getInviteUrl,
  getVoteUrl,
  trackLink,
};
