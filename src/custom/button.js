const { ButtonStyle, ButtonBuilder } = require("discord.js");

module.exports = class button extends ButtonBuilder {
  makeButton(customId, label, emoji, style, disabled = false) {
    if (!label && !emoji)
      throw new Error("Must provide either label or emoji !");

    this.setCustomId(customId);
    this.setStyle(style);
    this.setDisabled(disabled);
    if (label) this.setLabel(label);
    if (emoji) this.setEmoji(emoji);
  }

  p = (customId, label, emoji, disabled) => {
    this.makeButton(customId, label, emoji, ButtonStyle.Primary, disabled);
    return this;
  };

  s = (customId, label, emoji, disabled) => {
    this.makeButton(customId, label, emoji, ButtonStyle.Secondary, disabled);
    return this;
  };

  d = (customId, label, emoji, disabled) => {
    this.makeButton(customId, label, emoji, ButtonStyle.Danger, disabled);
    return this;
  };

  fail = (customId, label, emoji, disabled) => {
    this.makeButton(customId, label, emoji, ButtonStyle.Success, disabled);
    return this;
  };

  link = (label, uri) => {
    this.setURL(uri);
    this.setLabel(label);
    this.setStyle(ButtonStyle.Link);
    return this;
  };
};
