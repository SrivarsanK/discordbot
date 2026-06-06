const mongoose = require("mongoose");

const StickyMessageSchema = new mongoose.Schema(
  {
    channelId: { type: String, default: "" },
    content: { type: String, default: "" },
    lastMessageId: { type: String, default: "" },
    cooldownSeconds: { type: Number, default: 20 },
  },
  { _id: false },
);

const PremiumSettingsSchema = new mongoose.Schema(
  {
    guildId: { type: String, required: true, unique: true },

    branding: {
      enabled: { type: Boolean, default: false },
      nickname: { type: String, default: "" },
    },

    leveling: {
      enabled: { type: Boolean, default: false },
      chatEnabled: { type: Boolean, default: true },
      voiceEnabled: { type: Boolean, default: true },
      announceChannelId: { type: String, default: "" },
      levelUpMessage: {
        type: String,
        default: "{user} reached level {level}.",
      },
      chatXpMin: { type: Number, default: 8 },
      chatXpMax: { type: Number, default: 16 },
      chatCooldownSeconds: { type: Number, default: 45 },
      voiceXpPerMinute: { type: Number, default: 4 },
    },

    vcGuard: {
      enabled: { type: Boolean, default: false },
      protectedChannels: { type: [String], default: [] },
      bypassRoles: { type: [String], default: [] },
      logChannelId: { type: String, default: "" },
      action: { type: String, enum: ["disconnect"], default: "disconnect" },
      message: {
        type: String,
        default: "You are not allowed to join this protected voice channel.",
      },
    },

    sticky: {
      enabled: { type: Boolean, default: false },
      messages: { type: [StickyMessageSchema], default: [] },
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("PremiumSettings", PremiumSettingsSchema);
