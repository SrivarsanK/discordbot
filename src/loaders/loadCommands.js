const fs = require("fs");
const path = require("path");
const { normalizePermissions } = require("../utils/permissions");

module.exports = (client) => {
  const commandsPath = path.join(__dirname, "../commands");
  let totalCommands = 0;

  fs.readdirSync(commandsPath).forEach((dir) => {
    const commandFiles = fs
      .readdirSync(path.join(commandsPath, dir))
      .filter((file) => file.endsWith(".js"));
    for (const file of commandFiles) {
      let command;
      try {
        command = require(path.join(commandsPath, dir, file));
      } catch (error) {
        client.logger.log(`Skipped command with load error: ${dir}/${file} (${error.message})`, "warn");
        continue;
      }

      if (!command?.name || typeof command.execute !== "function") {
        client.logger.log(`Skipped invalid command: ${dir}/${file}`, "warn");
        continue;
      }

      command.botPerms = normalizePermissions(
        command.botPerms ?? command.botPrams ?? command.botPermissions ?? [],
      );
      command.userPerms = normalizePermissions(
        command.userPerms ?? command.userPrams ?? command.userPermissions ?? [],
      );
      client.commands.set(command.name, command);
      totalCommands++;
    }
  });

  client.logger.log(`Prefix Commands Loaded: ${totalCommands}`, "cmd");
};
