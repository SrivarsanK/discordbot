module.exports = {
  name: "messageDelete",
  run: async (client, message) => {
    if (message.partial || !message.guild || message.author?.bot) return;

    client.snipes = client.snipes || new Map();

    client.snipes.set(message.channel.id, {
      content: message.content,
      author: message.author,
      image: message.attachments.first()?.proxyURL || null,
      time: Date.now(),
    });
  },
};
