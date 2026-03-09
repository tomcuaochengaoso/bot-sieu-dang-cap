require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { REST, Routes } = require('discord.js');

const rest = new REST().setToken(process.env.DISCORD_TOKEN);
const clientId = process.env.DISCORD_CLIENT_ID;

// Guild IDs to clear (add any guild ID that might have stale commands)
const guildIds = [
  process.env.DISCORD_DEV_GUILD_ID,
  '1471025458249470105',
].filter(Boolean);

(async () => {
  try {
    // 1. Clear global commands
    await rest.put(Routes.applicationCommands(clientId), { body: [] });
    console.log('Cleared global commands');

    // 2. Clear guild-specific commands
    for (const guildId of guildIds) {
      await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: [] });
      console.log(`Cleared commands in guild ${guildId}`);
    }

    // 3. Load commands
    const commands = [];
    const commandsPath = path.join(__dirname, 'src', 'commands');

    for (const folder of fs.readdirSync(commandsPath)) {
      const folderPath = path.join(commandsPath, folder);
      if (!fs.statSync(folderPath).isDirectory()) continue;

      for (const file of fs.readdirSync(folderPath).filter(f => f.endsWith('.js'))) {
        const cmd = require(path.join(folderPath, file));
        if (cmd.data && cmd.execute) {
          commands.push(cmd.data.toJSON());
          console.log(`Loaded: ${cmd.data.name}`);
        }
      }
    }

    // 4. Deploy globally
    const results = await rest.put(Routes.applicationCommands(clientId), { body: commands });
    console.log(`\nDeployed ${results.length} commands globally.`);

  } catch (error) {
    console.error('Error:', error);
  }
})();
