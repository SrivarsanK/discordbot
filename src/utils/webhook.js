const { WebhookClient } = require("discord.js");
const { v2 } = require("./v2");

const DISCORD_WEBHOOK_URL =
  /^https?:\/\/(?:canary\.|ptb\.)?discord(?:app)?\.com\/api\/webhooks\/\d+\/[\w-]+$/i;

function isValidWebhookUrl(url) {
  return typeof url === "string" && DISCORD_WEBHOOK_URL.test(url.trim());
}

async function sendWebhook(client, url, payload, label = "webhook") {
  if (!url) return null;

  if (!isValidWebhookUrl(url)) {
    client?.logger?.log(`[Webhook] Skipped invalid ${label} URL.`, "warn");
    return null;
  }

  try {
    const webhook = new WebhookClient({ url: url.trim() });
    return await webhook.send(payload);
  } catch (error) {
    client?.logger?.log(
      `[Webhook] Failed to send ${label}: ${error.message || error}`,
      "warn",
    );
    return null;
  }
}

module.exports = {
  isValidWebhookUrl,
  sendWebhook,
};
