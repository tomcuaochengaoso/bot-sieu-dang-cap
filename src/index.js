require('dotenv').config();
const { Client, GatewayIntentBits, Partials } = require('discord.js');
const { connectDB } = require('./utils/connect-db');
const { loadCommands } = require('./utils/command-loader');
const { loadEvents } = require('./utils/event-loader');
const AnalyticsSystem = require('./analytics/setup');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildScheduledEvents,
    // Analytics intents
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildInvites,
    GatewayIntentBits.GuildWebhooks,
  ],
  partials: [
    Partials.Message,
    Partials.Channel,
    Partials.Reaction,
    Partials.GuildMember,
    Partials.User,
    Partials.ThreadMember,
  ],
});

global.discordClient = client;

connectDB();

loadCommands(client);

loadEvents(client);

// Initialize analytics pipeline (attaches event listeners to the shared client)
const analytics = new AnalyticsSystem(client);

// Graceful shutdown
const shutdown = async () => {
  console.log('\n[App] Shutdown signal received');
  await analytics.stop();
  client.destroy();
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

client.login(process.env.TOKEN)
  .then(() => {
    console.log(`Logged in as ${client.user.tag}`);
    analytics.start();
  })
  .catch(console.error);
