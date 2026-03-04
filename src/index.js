require('dotenv').config();
const { Client, GatewayIntentBits, MessageFlags } = require('discord.js');
const { connectDB } = require('./utils/connect-db');
const { loadCommands } = require('./utils/command-loader');
const { loadEvents } = require('./utils/event-loader');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildScheduledEvents
  ],
});

global.discordClient = client;

connectDB();

loadCommands(client);

loadEvents(client);

client.login(process.env.TOKEN)
  .then(() => console.log(`Logged in as ${client.user.tag}`))
  .catch(console.error);
