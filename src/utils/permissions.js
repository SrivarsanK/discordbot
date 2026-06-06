/** @format */

const legacyPermissions = {
  ADMINISTRATOR: "Administrator",
  VIEW_CHANNEL: "ViewChannel",
  SEND_MESSAGES: "SendMessages",
  SEND_TTS_MESSAGES: "SendTTSMessages",
  MANAGE_MESSAGES: "ManageMessages",
  EMBED_LINKS: "EmbedLinks",
  ATTACH_FILES: "AttachFiles",
  READ_MESSAGE_HISTORY: "ReadMessageHistory",
  MENTION_EVERYONE: "MentionEveryone",
  USE_EXTERNAL_EMOJIS: "UseExternalEmojis",
  ADD_REACTIONS: "AddReactions",
  MANAGE_CHANNELS: "ManageChannels",
  MANAGE_GUILD: "ManageGuild",
  MANAGE_ROLES: "ManageRoles",
  MANAGE_WEBHOOKS: "ManageWebhooks",
  MANAGE_NICKNAMES: "ManageNicknames",
  MANAGE_EMOJIS_AND_STICKERS: "ManageGuildExpressions",
  KICK_MEMBERS: "KickMembers",
  BAN_MEMBERS: "BanMembers",
  MODERATE_MEMBERS: "ModerateMembers",
  CONNECT: "Connect",
  SPEAK: "Speak",
  MUTE_MEMBERS: "MuteMembers",
  DEAFEN_MEMBERS: "DeafenMembers",
  MOVE_MEMBERS: "MoveMembers",
  USE_VAD: "UseVAD",
  PRIORITY_SPEAKER: "PrioritySpeaker",
  STREAM: "Stream",
  USE_APPLICATION_COMMANDS: "UseApplicationCommands",
  CREATE_PUBLIC_THREADS: "CreatePublicThreads",
  CREATE_PRIVATE_THREADS: "CreatePrivateThreads",
  SEND_MESSAGES_IN_THREADS: "SendMessagesInThreads",
};

function normalizePermissions(permissions) {
  if (!permissions) return [];
  const values = Array.isArray(permissions) ? permissions : [permissions];

  return values
    .map((permission) => {
      if (typeof permission !== "string") return permission;
      return legacyPermissions[permission] || permission;
    })
    .filter(Boolean);
}

module.exports = {
  normalizePermissions,
};
