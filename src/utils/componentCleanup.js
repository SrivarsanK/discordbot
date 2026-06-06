const { v2 } = require("./v2");

async function clearComponents(message, fallbackContent = "This menu has expired.") {
  if (!message?.edit) return null;

  const hasContent = Boolean(message.content?.trim());
  const hasEmbeds = Boolean(message.embeds?.length);
  const hasAttachments = Boolean(message.attachments?.size);

  const payload = hasContent || hasEmbeds || hasAttachments
    ? { components: [] }
    : v2({ content: fallbackContent, components: [] });

  return message.edit(payload).catch(() => null);
}

module.exports = {
  clearComponents,
};
