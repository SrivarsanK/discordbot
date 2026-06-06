const { v2 } = require("../../utils/v2");
/** @format
 * Updated: Components v2 ping command
 */

const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  MessageFlags,
} = require("discord.js");

module.exports = {
  name: "ping",
  category: "Information",
  aliases: ["pong", "latency"],
  description: "Check the bot's latency.",
  cooldown: 5,
  execute: async (message, args, client, prefix) => {
    const before = Date.now();
    const sent = await message.channel.send(v2({
      components: [
        new ContainerBuilder().addTextDisplayComponents(
          new TextDisplayBuilder().setContent("🏓 Pinging...")
        ),
      ],
      flags: MessageFlags.IsComponentsV2,
    }));

    const roundtrip = Date.now() - before;
    const ws = client.ws.ping;

    const quality =
      ws < 80 ? "🟢 Excellent" :
      ws < 150 ? "🟡 Good" :
      ws < 250 ? "🟠 Fair" : "🔴 Poor";

    const container = new ContainerBuilder();
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `## 🏓 Pong!\n` +
        `-# Connection quality: **${quality}**`
      )
    );
    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `> **WebSocket Latency** — \`${ws}ms\`\n` +
        `> **API Round-trip** — \`${roundtrip}ms\``
      )
    );
    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `-# Uptime: <t:${Math.round(Date.now() / 1000 - client.uptime / 1000)}:R>`
      )
    );

    await sent.edit(v2({
      components: [container],
      flags: MessageFlags.IsComponentsV2,
    }));
  },
};
