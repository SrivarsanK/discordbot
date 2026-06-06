const { v2 } = require("../../utils/v2");
const fs = require("fs");

module.exports = {
  name: "reloadall",
  category: "Owner",
  aliases: ["rdall"],
  description: "Reload all commands in the bot.",
  args: false,
  usage: "",
  permission: [],
  owner: true,
  execute: async (message, args, client, prefix) => {
    try {
      // Define the commands directory
      const commandsDir = `${process.cwd()}/src/commands`;

      // Clear the current commands collection
      client.commands.clear();

      // Read all categories in the commands directory
      const categories = fs.readdirSync(commandsDir);

      for (const category of categories) {
        const categoryPath = `${commandsDir}/${category}`;

        // Check if the category is a directory
        if (!fs.lstatSync(categoryPath).isDirectory()) continue;

        // Read all commands in the category
        const commandFiles = fs
          .readdirSync(categoryPath)
          .filter((file) => file.endsWith(".js"));

        for (const file of commandFiles) {
          const commandPath = `${categoryPath}/${file}`;

          // Delete the cached version of the command
          delete require.cache[require.resolve(commandPath)];

          // Re-require and load the command
          const command = require(commandPath);

          // Add the command to the collection
          if (command.name) {
            client.commands.set(command.name, command);
          }
        }
      }

      // Send a success message
      return message.channel.send(
        v2(`✅ All commands have been successfully reloaded!`),
      );
    } catch (error) {
      console.error(error);
      return message.channel.send(
        v2(`❌ An error occurred while reloading commands:\n\`${error.message}\``),
      );
    }
  },
};
