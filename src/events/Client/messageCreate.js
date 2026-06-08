/** @format */

const { v2 } = require("../../utils/v2");
const {
  EmbedBuilder,
  PermissionsBitField,
  ChannelType,
} = require("discord.js");
const db = require("../../schema/prefix.js");
const bl = require("../../schema/blacklist");
const IgnoreChannelModel = require("../../schema/ignorechannel");
const VoteBypassUserModel = require("../../schema/votebypassuser");
const db4 = require("../../schema/noprefix");
const { normalizePermissions } = require("../../utils/permissions");
const { getFooterText, getVoteUrl } = require("../../utils/botMeta");
const { sendCommandLog } = require("../../utils/commandLog");
const { isBotOwner } = require("../../utils/owners");
const cooldowns = new Map();

module.exports = {
  name: "messageCreate",
  run: async (client, message) => {
    if (message.author.bot || !message.guild) return;

    // Verify thread/forum channel log validation command: !verify-log <token>
    if (message.content.startsWith("!verify-log ")) {
      const token = message.content.substring(12).trim();
      const Logging = require("../../schema/logging");
      const loggingData = await Logging.findOne({ guildId: message.guild.id });
      if (loggingData) {
        const matchingTokenIndex = (loggingData.verificationTokens || []).findIndex(
          t => t.token === token && t.expiresAt > Date.now()
        );
        if (matchingTokenIndex !== -1) {
          const matchingToken = loggingData.verificationTokens[matchingTokenIndex];
          const eventKey = matchingToken.eventKey;

          let targetChannelId = message.channel.id;
          if (message.channel.isThread()) {
            const parent = message.channel.parent || await message.guild.channels.fetch(message.channel.parentId).catch(() => null);
            if (parent && parent.type === ChannelType.GuildForum) {
              targetChannelId = parent.id;
            }
          }

          // Set the channel for this event type to the message channel (or parent forum channel)
          loggingData.eventChannels = {
            ...(loggingData.eventChannels || {}),
            [eventKey]: targetChannelId
          };

          // Remove the used token
          loggingData.verificationTokens.splice(matchingTokenIndex, 1);
          loggingData.markModified("eventChannels");
          loggingData.markModified("verificationTokens");
          await loggingData.save();

          // Delete user message and reply
          await message.delete().catch(() => {});
          const reply = await message.channel.send(
            `✅ Channel successfully verified as the log destination for **${eventKey}**!`
          ).catch(() => null);
          if (reply) {
            setTimeout(() => reply.delete().catch(() => {}), 5000);
          }
          return;
        }
      }
    }

    let prefix = client.prefix;
    const ress = await db.findOne({ Guild: message.guildId });
    if (ress && ress.Prefix) prefix = ress.Prefix;
    if (message.content.includes(client.owner)) {
      await message.react(client.emoji.owner).catch(() => {});
    }

    const mention = new RegExp(`^<@!?${client.user.id}>( |)$`);
    if (message.content.match(mention)) {
      if (
        !message.guild.members.me.permissions.has(
          PermissionsBitField.resolve("SendMessages"),
        )
      )
        return await message.author
          .send(v2({
            content: `I don't have **\`SEND_MESSAGES\`** permission in <#${message.channelId}> to send my mention response.`,
          }))
          .catch(() => null);

      if (
        !message.guild.members.me.permissions.has(
          PermissionsBitField.resolve("ViewChannel"),
        )
      )
        return;

      if (
        !message.guild.members.me.permissions.has(
          PermissionsBitField.resolve("EmbedLinks"),
        )
      )
        return await message.channel
          .send(v2({
            content: `I don't have **\`EMBED_LINKS\`** permission in <#${message.channelId}> to send my mention response.`,
          }))
          .catch(() => {});
      const embed = new EmbedBuilder()
        
        .setDescription(
          `Hey ${message.author}, my prefix here is \`${prefix}\`.\nModified by SrivarsanK.`,
        )
        .setFooter({
          text: getFooterText(client),
          iconURL: client.user.displayAvatarURL(),
        });

      return message.channel.send(v2({ embeds: [embed] })).catch(() => null);
    }

    const np = [];
    const npData = await db4.findOne({
      userId: message.author.id,
      noprefix: true,
    });
    if (npData) np.push(message.author.id);

    const regex = new RegExp(`^<@!?${client.user.id}>`);
    const pre = message.content.match(regex)
      ? message.content.match(regex)[0]
      : prefix;
    if (!np.includes(message.author.id)) {
      if (!message.content.startsWith(pre)) return;
    }

    const args =
      np.includes(message.author.id) === false
        ? message.content.slice(pre.length).trim().split(/ +/)
        : message.content.startsWith(pre) === true
          ? message.content.slice(pre.length).trim().split(/ +/)
          : message.content.trim().split(/ +/);
    const commandName = args.shift().toLowerCase();

    const command =
      client.commands.get(commandName) ||
      client.commands.find(
        (cmd) => cmd.aliases && cmd.aliases.includes(commandName),
      );

    if (!command) return;
    command.botPerms = normalizePermissions(
      command.botPerms ?? command.botPrams ?? command.botPermissions ?? [],
    );
    command.userPerms = normalizePermissions(
      command.userPerms ?? command.userPrams ?? command.userPermissions ?? [],
    );
      
          const blusers = await bl.findOne({userId: message.author.id })
    if (blusers) {
      const embed = new client.embed().a(`You have been blacklisted from using the bot!`, message.author.displayAvatarURL());
      const m = await message.channel.send(v2({ embeds: [embed] })).catch(() => null);
      if (m) setTimeout(() => m.delete().catch(() => null), 5000);
      return;
    }

    if (!cooldowns.has(command.name)) {
      cooldowns.set(command.name, new Map());
    }

    const now = Date.now();
    const timestamps = cooldowns.get(command.name);
    const cooldownAmount = (command.cooldown || 3) * 1000; // Default cooldown: 3 seconds

    if (timestamps.has(message.author.id)) {
      const expirationTime = timestamps.get(message.author.id) + cooldownAmount;

      if (now < expirationTime) {
        const timeLeft = Math.round(expirationTime / 1_000);
        const cooldownEmbed = new EmbedBuilder()
          
          .setDescription(
            `Please wait **<t:${timeLeft}:R>** before reusing the \`${command.name}\` command.`,
          );
        return message.reply(v2({ embeds: [cooldownEmbed] })).then((msg) => {
          const delayTime = expirationTime - now; // Calculate the remaining cooldown time
          setTimeout(() => {
            msg.delete();
          }, delayTime);
        });
      }
    }
    timestamps.set(message.author.id, now);
    setTimeout(() => timestamps.delete(message.author.id), cooldownAmount);

    const ICHchannelId = message.channel.id;
    const ignoreDoc = await IgnoreChannelModel.findOne({ guildId: message.guild.id }).lean();
    const ignoredChannels = Array.isArray(ignoreDoc?.channels) ? ignoreDoc.channels : [];
    const isIgnored = ignoredChannels.includes(ICHchannelId);
    if (isIgnored) {
      const baap = new EmbedBuilder()
        .setAuthor({
          name: `This channel is set to ignored channel..`,
          iconURL: message.author.displayAvatarURL(),
        })
        ;
      const ignoreMessage = await message.channel.send(v2({ embeds: [baap] })).catch(() => null);
      setTimeout(() => {
        ignoreMessage?.delete().catch(console.error);
      }, 3000);
      return;
    }

    if (command.voteonly || command.voteOnly) {
      const hasVoted = client.topgg?.hasVoted
        ? await client.topgg.hasVoted(message.author.id).catch(() => false)
        : true;
      const voteBypassUser = await VoteBypassUserModel.findOne({
        userId: message.author.id,
      });
      if (!hasVoted && !voteBypassUser) {
        const embed = new EmbedBuilder()
          .setDescription(
            `__This Command Is Only For Our Voters So Vote Us Now By [Clicking Here](${getVoteUrl(client)})__`,
          )
          ;
        return message.channel.send(v2({ embeds: [embed] })).catch(() => null);
      }
    }

    if (
      !message.guild.members.me.permissions.has(
        PermissionsBitField.resolve("SendMessages"),
      )
    )
      return await message.author
        .send(v2({
          content: `I don't have **\`SEND_MESSAGES\`** permission in <${message.guild.name}> to execute this **\`${command.name}\`** command.`,
        }))
        .catch(() => {});

    if (
      !message.guild.members.me.permissions.has(
        PermissionsBitField.resolve("ViewChannel"),
      )
    )
      return;

    if (
      !message.guild.members.me.permissions.has(
        PermissionsBitField.resolve("EmbedLinks"),
      )
    )
      return await message.author
        .send(v2({
          content: `I don't have **\`EMBED_LINKS\`** permission in <#${message.guild.name}> to execute this **\`${command.name}\`** command.`,
        }))
        .catch(() => {});

    if (command.args && !args.length) {
      let reply = `You didn't provide any arguments, ${message.author}!`;

      if (command.usage) {
        reply += `\nUsage: \`${prefix}${command.name} ${command.usage}\``;
      }

      const embed = new EmbedBuilder()
        
        .setDescription(reply);
      return message.channel.send(v2({ embeds: [embed] })).catch(() => null);
    }

    if (command.botPerms) {
      if (
        !message.guild.members.me.permissions.has(
          PermissionsBitField.resolve(command.botPerms || []),
        )
      ) {
        const embed = new EmbedBuilder().setDescription(
          `I don't have **\`${command.botPerms}\`** permission in <#${message.channelId}> to execute this **\`${command.name}\`** command.`,
        );
        return message.channel.send(v2({ embeds: [embed] })).catch(() => null);
      }
    }
    if (command.userPerms) {
      if (
        !message.member.permissions.has(
          PermissionsBitField.resolve(command.userPerms || []),
        )
      ) {
        const embed = new EmbedBuilder()
          
          .setDescription(
            `You don't have **\`${command.userPerms}\`** permission in <#${message.channelId}> to execute this **\`${command.name}\`** command.`,
          );
        return message.channel.send(v2({ embeds: [embed] })).catch(() => null);
      }
    }

    if (command.owner && !isBotOwner(client, message.author.id)) {
      const embed = new EmbedBuilder().setAuthor({
        name: `Only configured bot owners can use this command.`,
        iconURL: message.author.displayAvatarURL(),
      });
      return message.channel.send(v2({ embeds: [embed] })).catch(() => null);
    }

    if (command.category === "Antinuke" || command.category === "Automod") {
      const AntiNuke = require("../../schema/antinuke");
      const antinukeConfig = await AntiNuke.findOne({ guildId: message.guild.id });
      const extraOwners = antinukeConfig?.extraOwners || [];
      const whitelistRoles = antinukeConfig?.whitelistRoles || [];

      const hasWhitelistedRole = message.member.roles.cache.some(role => whitelistRoles.includes(role.id));
      const isAuthorized =
        message.author.id === message.guild.ownerId ||
        isBotOwner(client, message.author.id) ||
        extraOwners.includes(message.author.id) ||
        hasWhitelistedRole;

      if (!isAuthorized) {
        const embed = new EmbedBuilder()
          .setDescription(`❌ | Only the **server owner**, **extra owners**, or members with **whitelisted roles** can use security commands.`);
        return message.channel.send(v2({ embeds: [embed] })).catch(() => null);
      }
    }

    const player = client.manager.players.get(message.guild.id);
    if (command.player && !player) {
      return message.channel.send(v2(`i'm not in any vc!`)).catch(() => null);;
    }
    if (command.inVoiceChannel && !message.member.voice.channelId) {
      const embed = new EmbedBuilder().setAuthor({
        name: `Your are not in any vc`,
        iconURL: message.author.displayAvatarURL(),
      });
      return message.channel.send(v2({ embeds: [embed] })).catch(() => null);
    }

    if (command.sameVoiceChannel) {
      if (message.guild.members.me.voice.channel) {
        if (
          message.guild.members.me.voice.channelId !==
          message.member.voice.channelId
        ) {
          const embed = new EmbedBuilder().setAuthor({
            name: `Your are not in same vc`,
            iconURL: message.author.displayAvatarURL(),
          });
          return message.channel.send(v2({ embeds: [embed] })).catch(() => null);
        }
      }
    }
    //

    const isMusicOrPlaylist = command.category === "Music" || command.category === "Playlist";
    if (!isMusicOrPlaylist) {
      // Delete command trigger message
      message.delete().catch(() => {});

      // Intercept channel.send and reply to auto-delete after 1 minute (60 seconds)
      const originalSend = message.channel.send.bind(message.channel);
      const originalReply = message.reply.bind(message);

      const autoDeleteResponse = async (promise) => {
        try {
          const sentMessage = await promise;
          if (sentMessage && typeof sentMessage.delete === "function") {
            setTimeout(() => {
              sentMessage.delete().catch(() => {});
            }, 60000);
          }
          return sentMessage;
        } catch (err) {
          throw err;
        }
      };

      message.channel.send = (options) => autoDeleteResponse(originalSend(options));
      message.reply = (options) => autoDeleteResponse(originalReply(options));
    }

    Promise.resolve()
      .then(() => command.execute(message, args, client, prefix))
      .catch((error) => {
        client.logger?.log(
          `[Command] ${command.name} failed: ${error.stack || error}`,
          "error",
        );
      });
    if (command && command.execute) {
      const commandlog = new EmbedBuilder()
        .setAuthor({
          name: message.author.tag,
          iconURL: message.author.displayAvatarURL({ dynamic: true }),
        })
        
        .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
        .setTimestamp()
        .setDescription(
          `Command Just Used In : \`${message.guild.name} | ${message.guild.id}\`\n Command Used In Channel : \`${message.channel.name} | ${message.channel.id}\`\n Command Name : \`${command.name}\`\n Command Executor : \`${message.author.tag} | ${message.author.id}\`\n Command Content : \`${message.content}\``,
        );
      sendCommandLog(client, message.guild, commandlog);
    }
  },
};
