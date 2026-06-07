const { v2 } = require("../../utils/v2");
const { promisify } = require("util");
const Wait = promisify(setTimeout);
const { ChannelType } = require("discord.js");

module.exports = {
  name: "voiceStateUpdate",
  run: async (client, oldState, newState) => {
    const guildId = newState.guild.id;
    const player = client.manager.players?.get(guildId);
    const guild = client.guilds.cache.get(guildId)
    if (!player) return;

    const botId = client.user.id;
    const botMember = newState.guild.members.cache.get(botId);
    const botVoiceChannel = botMember?.voice.channel;

    // 1. ✅ BOT DISCONNECTED FROM VC
    if (
      !botVoiceChannel ||
      (oldState.channelId && !newState.channelId && oldState.id === botId)
    ) {
      try {
        await client.rest
          .put(`/channels/${player.voiceId}/voice-status`, {
            body: { status: `` },
          })
          .catch(() => null);

        await Wait(3000);
        await player?.destroy();
          
        const textChannel = client.channels.cache.get(player.textId);
        if (textChannel) {
          textChannel
            .send(v2({ embeds: [new client.embed().setAuthor({name: `The bot has been disconnected from the Voice Channel`, icon: guild.iconURL()})] }))
            .then((msg) =>
              setTimeout(() => msg.delete().catch(() => null), 5000)
            )
            .catch(() => null);
        }
      } catch (error) {
        console.error(`Error handling voiceStateUpdate (disconnect): ${error}`);
      }
      return;
    }

    // 2. 🔀 BOT MOVED TO ANOTHER VC
    if (
      oldState.id === botId &&
      oldState.channelId &&
      newState.channelId &&
      oldState.channelId !== newState.channelId
    ) {
      try {
        player.setVoiceChannel(newState.channelId);

        const textChannel = client.channels.cache.get(player.textId);
        if (textChannel) {
          textChannel
            .send(v2({ embeds: [new client.embed().setAuthor({name: `The bot was moved to another Voice Channel`, icon: guild.iconURL()})] }))
            .then((msg) =>
              setTimeout(() => msg.delete().catch(() => null), 5000)
            )
            .catch(() => null);
        }
      } catch (err) {
        console.error(`Error handling bot moved VC: ${err}`);
      }
    }

    // 3. 👋 BOT LEFT ALONE IN VC
    const currentChannel = oldState.channel || newState.channel;
    if (
      currentChannel &&
      currentChannel.type === ChannelType.GuildVoice &&
      currentChannel.members.has(botId) &&
      currentChannel.members.filter((m) => !m.user.bot).size === 0
    ) {
      setTimeout(async () => {
        const db = require("../../schema/247");
        const has247 = await db.findOne({ Guild: guildId });
        if (has247) return;

        const activePlayer = client.manager.players.get(guildId);
        const stillInVC = currentChannel.members.has(botId);
        const stillAlone =
          currentChannel.members.filter((m) => !m.user.bot).size === 0;

        // ✅ Only destroy if playing
        if (activePlayer && stillInVC && stillAlone && activePlayer.playing) {
          await activePlayer.destroy();

          const textChannel = client.channels.cache.get(activePlayer.textId);
          if (textChannel) {
            textChannel
              .send(v2({
                embeds: [
                  new client.embed().setAuthor({
                    name: `Left the Voice Channel due to inactivity`,
                    icon: guild.iconURL(),
                  }),
                ],
              }))
              .then((msg) =>
                setTimeout(() => msg.delete().catch(() => null), 5000)
              )
              .catch(() => null);
          }
        }
      }, 1000 * 60); // 1 minute timeout
    }
  },
};