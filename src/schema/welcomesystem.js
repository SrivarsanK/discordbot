/** @format */
const { ShimModel } = require("../db/shim");
const { welcomeSystem } = require("../db/schema");

const Model = new ShimModel(welcomeSystem);

async function getSettings(guild) {
  if (!guild?.id) {
    throw new Error("Guild ID is undefined");
  }

  let guildData = await Model.findOne({ guildId: guild.id });
  if (!guildData) {
    guildData = new Model({
      guildId: guild.id,
      data: {
        name: guild.name,
        region: guild.preferredLocale,
        owner: {
          id: guild.ownerId,
          tag: guild.members.cache.get(guild.ownerId)?.user?.tag,
        },
        joinedAt: guild.joinedAt,
      },
      welcome: {
        enabled: false,
        autodel: 0,
        channel: "",
        content: "",
        embed: {
          enabled: false,
          image: "",
          description: "",
          color: "",
          title: "",
          thumbnail: "",
          footer: "",
        },
        dynamicImages: {
          enabled: false,
          attachedId: "default",
          templates: [],
        },
      },
    });
    await guildData.save();
  }
  return guildData;
}

module.exports = { getSettings, Model };
