require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { REST, Routes } = require('discord.js');

const rest = new REST().setToken(process.env.DISCORD_TOKEN);
const clientId = process.env.DISCORD_CLIENT_ID;

const guildId = process.env.DISCORD_DEV_GUILD_ID || 'YOUR_GUILD_ID_HERE';

(async () => {
  try {
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

    const results = await rest.put(
      Routes.applicationGuildCommands(clientId, guildId),
      { body: commands }
    );
    console.log(`\nDeployed ${results.length} commands to guild ${guildId} instantly.`);

  } catch (error) {
    console.error('Error:', error);
  }
})();
