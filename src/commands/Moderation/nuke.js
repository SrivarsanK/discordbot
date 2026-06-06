/** @format */

const { v2 } = require("../../utils/v2");

const {
  EmbedBuilder,
  MessageFlags,
  ButtonBuilder,
  ActionRowBuilder,
  ButtonStyle,
} = require("discord.js");
const { clearComponents } = require("../../utils/componentCleanup");

module.exports = {
  name: "nuke",
  category: "Moderation",
  aliases: ["fuckchannel"],
  cooldown: 3,
  description: "Nukes a channel by deleting and recreating it.",
  args: false,
  usage: "",
  userPerms: ["ManageChannels"],
  botPerms: ["ManageChannels"],
  owner: false,
  execute: async (message, args, client, prefix) => {
    try {
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("YES")
          .setStyle(ButtonStyle.Success)
          .setLabel("Yes"),
        new ButtonBuilder()
          .setCustomId("NO")
          .setStyle(ButtonStyle.Danger)
          .setLabel("No"),
      );

      const confirmEmbed = new EmbedBuilder()
        
        .setDescription(`Are you sure you want to nuke this channel?`);

      const confirmationMsg = await message.reply(v2({
        embeds: [confirmEmbed],
        components: [row],
      }));

      const filter = (interaction) => {
        if (interaction.user.id === message.author.id) return true;
        return interaction.reply(v2({
          content: `Only ${message.author.username} can use these buttons.`,
          flags: MessageFlags.Ephemeral,
        }));
      };

      const collector = message.channel.createMessageComponentCollector({
        filter,
        max: 1,
        time: 30000, // Set timeout in case user doesn't respond
      });

      collector.on("collect", async (buttonInteraction) => {
        const id = buttonInteraction.customId;

        if (id === "YES") {
          const reason = args.join(" ") || "No Reason";

          const nukeEmbed = new EmbedBuilder()
            .setTitle("**Channel Successfully Nuked**")
            ;

          const clonedChannel = await message.channel.clone();
          await clonedChannel.setParent(message.channel.parent);
          await clonedChannel.setPosition(message.channel.position);
          await message.channel.delete();

          const nukeMsg = await clonedChannel.send(v2({ embeds: [nukeEmbed] }));
          setTimeout(() => nukeMsg.delete().catch(() => {}), 30000);
        }

        if (id === "NO") {
          confirmationMsg.delete().catch(() => {});
        }
      });

      collector.on("end", async () => {
        clearComponents(confirmationMsg);
      });
    } catch (err) {
      return message.channel.send(v2({
        embeds: [
          new EmbedBuilder()
            
            .setDescription(`I was unable to nuke this channel.`),
        ],
      }));
    }
  },
};
