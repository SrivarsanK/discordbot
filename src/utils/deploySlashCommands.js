const { REST, Routes } = require("discord.js");

async function deploySlashCommands(client) {
  if (!client.slashCommandData || client.slashCommandData.length === 0) {
    client.logger.log("No slash commands to deploy", "warn");
    return;
  }

  const rest = new REST({ version: "10" }).setToken(client.token);
  const clientId = client.config.clientId || client.user.id;

  try {
    console.log(`Started refreshing ${client.slashCommandData.length} application (/) commands.`);
    client.logger.log(
      `Started refreshing ${client.slashCommandData.length} application (/) commands.`,
      "log"
    );

    // 1. Deploy globally (clear global commands in development to avoid duplicates)
    const deployGlobal = process.env.DEPLOY_GLOBAL === "true";
    const data = await rest.put(
      Routes.applicationCommands(clientId),
      { body: deployGlobal ? client.slashCommandData : [] }
    );

    console.log(`Successfully reloaded ${data.length} global application (/) commands.`);
    client.logger.log(
      `Successfully reloaded ${data.length} global application (/) commands.`,
      "ready"
    );

    // 2. Deploy to all currently joined guilds for instant access in dev/testing
    if (client.guilds.cache.size > 0) {
      console.log(`Deploying slash commands to ${client.guilds.cache.size} guild(s) for instant registration...`);
      for (const [guildId, guild] of client.guilds.cache) {
        await rest.put(
          Routes.applicationGuildCommands(clientId, guildId),
          { body: client.slashCommandData }
        ).catch(err => {
          console.error(`Failed to deploy commands to guild ${guildId} (${guild.name}): ${err.message}`);
        });
      }
      console.log("Successfully registered guild-specific slash commands.");
    }
  } catch (error) {
    console.error(`Error deploying slash commands: ${error}`);
    client.logger.log(`Error deploying slash commands: ${error}`, "error");
  }
}

module.exports = deploySlashCommands;
