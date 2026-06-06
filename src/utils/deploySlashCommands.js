const { REST, Routes } = require("discord.js");

async function deploySlashCommands(client) {
  if (!client.slashCommandData || client.slashCommandData.length === 0) {
    client.logger.log("No slash commands to deploy", "warn");
    return;
  }

  const rest = new REST({ version: "10" }).setToken(client.token);

  try {
    console.log(`Started refreshing ${client.slashCommandData.length} application (/) commands.`);
    client.logger.log(
      `Started refreshing ${client.slashCommandData.length} application (/) commands.`,
      "log"
    );

    
    const data = await rest.put(
      Routes.applicationCommands(client.config.clientId || client.user.id),
      { body: client.slashCommandData }
    );

    console.log(`Successfully reloaded ${data.length} application (/) commands.`);
    client.logger.log(
      `Successfully reloaded ${data.length} application (/) commands.`,
      "ready"
    );
  } catch (error) {
    console.error(`Error deploying slash commands: ${error}`);
    client.logger.log(`Error deploying slash commands: ${error}`, "error");
  }
}

module.exports = deploySlashCommands;
