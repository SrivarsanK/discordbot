const fs = require("fs");
const path = require("path");
const { REST, Routes } = require("discord.js");
const { normalizePermissions } = require("../utils/permissions");

module.exports = (client) => {
  const slashCommandsPath = path.join(__dirname, "../slashCommands");
  const data = [];
  let totalCommands = 0;

  fs.readdirSync(slashCommandsPath).forEach((dir) => {
    const slashCommandFiles = fs
      .readdirSync(path.join(slashCommandsPath, dir))
      .filter((file) => file.endsWith(".js"));
    for (const file of slashCommandFiles) {
      let slashCommand;
      try {
        slashCommand = require(path.join(slashCommandsPath, dir, file));
      } catch (error) {
        client.logger.log(`Skipped slash command with load error: ${dir}/${file} (${error.message})`, "warn");
        continue;
      }

      if (
        !slashCommand.name ||
        !slashCommand.description ||
        typeof slashCommand.run !== "function"
      ) {
        client.logger.log(`Skipped invalid slash command: ${dir}/${file}`, "warn");
        continue;
      }

      slashCommand.botPerms = normalizePermissions(
        slashCommand.botPerms ??
          slashCommand.botPrams ??
          slashCommand.botPermissions ??
          [],
      );
      slashCommand.userPerms = normalizePermissions(
        slashCommand.userPerms ??
          slashCommand.userPrams ??
          slashCommand.userPermissions ??
          [],
      );
      client.slashCommands.set(slashCommand.name, slashCommand);
      data.push({
        name: slashCommand.name,
        description: slashCommand.description,
        options: slashCommand.options || [],
      });
      totalCommands++;
    }
  });

  client.logger.log(`Slash Commands Loaded: ${totalCommands}`, "cmd");

  
  client.slashCommandData = data;
};
