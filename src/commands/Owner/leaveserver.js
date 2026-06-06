const { v2 } = require("../../utils/v2");
module.exports = {
  name: "leaveserver",
  category: "Owner",
  aliases: ["lv"],
  description: "Leave server",
  args: false,
  usage: "<guild id>",
  permission: [],
  owner: true,
  execute: async (message, args, client, prefix) => {
    const guild = client.guilds.cache.get(args[0]);
    if (!guild)
      return message.reply(v2({
        content: "Could not find the Guild to Leave",
      }));
    guild
      .leave()
      .then((g) => {
        message.channel.send(v2({
          content: `Left \`${g.name} | ${g.id}\``,
        }));
      })
      .catch((e) => {
        message.reply(v2(`${e.message ? e.message : e}`), {
          code: "js",
        });
      });
  },
};
