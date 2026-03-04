require('dotenv').config();
const fs = require('node:fs');
const path = require('node:path');
const { REST, Routes } = require('discord.js');

const commands = [];
const commandsPath = path.join(__dirname, '..', 'commands');

for (const folder of fs.readdirSync(commandsPath)) {
  const folderPath = path.join(commandsPath, folder);

  if (!fs.statSync(folderPath).isDirectory()) continue;

  const commandFiles = fs.readdirSync(folderPath).filter(file => file.endsWith('.js'));

  for (const file of commandFiles) {
    const filePath = path.join(folderPath, file);
    const command = require(filePath);

    if ('data' in command && 'execute' in command) {
      console.log(`Loaded: ${command.data.name}`);
      commands.push(command.data.toJSON());
    } else {
      console.log(`[WARNING] The command at ${filePath} is missing "data" or "execute".`);
    }
  }
}

const rest = new REST().setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    // 1. Deploy to dev guild for instant testing
    if (process.env.DISCORD_DEV_GUILD_ID) {
      console.log('Deploying to dev guild for instant testing...');
      await rest.put(
        Routes.applicationGuildCommands(
          process.env.DISCORD_CLIENT_ID,
          process.env.DISCORD_DEV_GUILD_ID
        ),
        { body: commands },
      );
      console.log('Dev guild commands updated instantly!');
    }

    // 2. Also deploy globally for all servers
    console.log(`\nDeploying ${commands.length} commands globally...`);
    const results = await rest.put(
      Routes.applicationCommands(process.env.DISCORD_CLIENT_ID),
      { body: commands },
    );
    console.log(`Successfully deployed ${results.length} commands globally!`);
    console.log('May take 1-2 hours to appear in all servers.');
    
  } catch (error) {
    console.error('Error:', error);
  }
})();