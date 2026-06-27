const {
  Webhooks: { guild_leave },
} = require("../../config.js");
const { sendWebhook } = require("../../utils/webhook");
const VoiceRole = require("../../schema/voicerole");
const AntiSpam = require("../../schema/antispam");
const db = require("../../schema/antilink");
const arr = require("../../schema/ar");
const AutoRole = require("../../schema/autorole");

const moment = require("moment");

module.exports = {
  name: "guildDelete",
  run: async (client, guild) => {
    try {
      const vc = await VoiceRole.findOne({ guildId: guild.id });
      const antiLinkData = await db.findOne({ guildId: guild.id });
      const antiSpamData = await AntiSpam.findOne({ guildId: guild.id });
      const ardata = await arr.findOne({ guildId: guild.id });
      const AutoroleData = await AutoRole.findOne({ guildId: guild.id });

      // Check if the result exists before attempting to delete
      if (AutoroleData) await AutoroleData.delete().catch(() => {});
      if (vc) await vc.delete().catch(() => {});
      if (antiLinkData) await antiLinkData.delete().catch(() => {});
      if (antiSpamData) await antiSpamData.delete().catch(() => {});
      if (ardata) await ardata.delete().catch(() => {});
      const own = await guild?.fetchOwner();

        const embed = new client.embed()
          .thumb(guild.iconURL({ dynamic: true, size: 1024 }))
          .t(`Left a Guild !!`)
          .addFields([
            { name: "Name", value: `\`${guild.name}\`` },
            { name: "ID", value: `\`${guild.id}\`` },
            {
              name: "Owner",
              value: `\`${own?.user?.tag || "Unknown User"} [ ${own?.id || "Unknown"} ]\``,
            },
            { name: "Member Count", value: `\`${guild.memberCount}\` Members` },
            {
              name: "Creation Date",
              value: `\`${moment.utc(guild.createdAt).format("DD/MMM/YYYY")}\``,
            },
            {
              name: `${client.user.username}'s Server Count`,
              value: `\`${client.guilds.cache.size}\` Servers`,
            },
          ])
          .setTimestamp();

      sendWebhook(client, guild_leave, { embeds: [embed] }, "guild leave");
      client.updatePresence?.();
    } catch (error) {
      console.error("Error in guildDelete event:", error);
    }
  },
};
