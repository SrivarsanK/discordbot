const { v2 } = require("../../utils/v2");
const { ActionRowBuilder, RoleSelectMenuBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
    name: "rolemenu",
    aliases: ["rm"],
    category: "Moderation",
    owner: true,
    description: "Displays a role menu for users to select a role.",
    execute: async (message, args, client, prefix) => {
        const targetUser = message.mentions.members.first();

        if (!targetUser) message.channel.send(v2({embeds: [new client.embed().d(`please mention a user`)]}))
        const roleMenu = new RoleSelectMenuBuilder()
            .setCustomId(`role_menu_${targetUser.id}`)
            .setPlaceholder("Select a role to assign/remove")
            .setMaxValues(10); // Allow selecting only one role at a time

        const row = new ActionRowBuilder().addComponents(roleMenu);

        const embed = new EmbedBuilder()
            .setTitle("Role Menu")
            .setDescription("Select a role from the dropdown to assign or remove it.")
            .setFooter({ text: `Requested by ${message.author.tag}` });

        const msg = await message.channel.send(v2({ embeds: [embed], components: [row] }));

        const collector = msg.createMessageComponentCollector({ time: 60000 });

        collector.on("collect", async (interaction) => {
            if (interaction.user.id !== message.author.id) {
                return interaction.reply(v2({ content: "This menu is not for you!", ephemeral: true }));
            }

            const selectedRole = interaction.values[0];

            if (!selectedRole) return;

            const role = message.guild.roles.cache.get(selectedRole);

            if (role) {
                if (targetUser.roles.cache.has(role.id)) {
                    await targetUser.roles.remove(role);
                    await interaction.reply(v2({ content: `Removed **${role.name}** from you.`, ephemeral: true }));
                } else {
                    await targetUser.roles.add(role);
                    await interaction.reply(v2({ content: `Added **${role.name}** to you.`, ephemeral: true }));
                }
            }
        });
    }
};
