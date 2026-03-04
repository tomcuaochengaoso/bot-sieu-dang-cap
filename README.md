# Simple Discord bot

A customizable Discord bot for welcoming members, managing goodbyes, and collecting feedback.

## Overview

- Customizable welcome messages with embeds
- Goodbye messages when members leave
- Feedback collection system with MongoDB storage
- Interactive buttons for guides, rules, and feedback
- Per-server configuration
- Automatic feedback after a scheduled event for analysis

## Prerequisites

Before you begin, ensure you have:
- [Node.js](https://nodejs.org/) v16.9.0 or higher
- [MongoDB](https://www.mongodb.com/) database (local or cloud)
- A Discord account and server with admin permissions

## Installation

1. **Clone the repository**
```bash
   git clone (https://github.com/tomcuaochengaoso/bot-sieu-dang-cap)
   cd discord-bot
```

2. **Install dependencies**
- Move into project root folder and install dependencies with:
`npm install`

3. **Set up environment variables**
- Copy `example.env` to `.env`
- Fill in your Discord bot credentials:
   - Get your `DISCORD_TOKEN` and `DISCORD_CLIENT_ID` from the Discord Developer Portal
   - Set `DISCORD_DEV_GUILD_ID` to your development server ID (optional, for faster command testing)
- Add your MONGODB_URI (e.g., mongodb://localhost:27017/discord-bot or a MongoDB Atlas connection string)

4. **Invite the bot to your server**
- In the Discord Developer Portal, go to OAuth2 > URL Generator
- Select bot and applications.commands scopes
- Select necessary permissions (Administrator recommended for setup)
- Use the generated URL to invite the bot

5. **Start the bot**
- Use `node src/index.js` or `nodemon`

## Available commands
### Welcome System
- `/setup-welcome-channel` - Configure welcome channel and message
- `/remove-welcome-channel` - Remove welcome channel configuration
### Feedback System
- `/setup-feedback-channel` - Set up channel for receiving feedback
- `/remove-feedback-channel` - Remove feedback channel
- `/set-main-guild` - Set main guild for DM feedback
- `/remove-main-guild` - Remove main guild configuration
- `/send-feedback-to-user` - Manually send feedback request to a user
- `/view-feedback` - View collected feedback
### Info
- `/ping` - Check bot latency

## Customize
### Customizing welcome messages and welcome channel
#### Customizing welcome message
##### File: `src/events/guild/send-welcome-message.js`
- Modify the `buttons` constant (around line 32) to add/remove interactive buttons
- Customize the `welcomeEmbed` (lines 59-70) to change the embed appearance
- The default message template supports placeholders:
   - `{mention-member}` - Mentions the new member
   - `{username}` - Member's username
   - `{server-name}` - Server name
- You can set a custom message via `/setup-welcome-channel` command
#### Customizing goodbye message
File: `src/events/guild/send-goodbye-messages.js`
- Similar to the welcome message, you can modify the content and component of the message
### Customizing feedback system
#### Customizing the feedback modal 
##### File: `src/models/Feedback-modal.js`
- Modify the modal title and questions
- Add or remove input fields
#### Customizing the feedback channel
##### File: `src/models/Feedback.js`  
- Customize the `embed` that displays feedback in the channel (lines 85-94)
- Change colors, fields, and formatting
#### Customizing event feedback
##### File: `src/events/scheduled-event/guildScheduledEventUpdate.js`
- Modify the message sent to users after events (line 60)
- Adjust the delay between messages to avoid rate limits (add delay in the loop around line 63)
## Development
### Adding new slash commands
1. Create your command file in the appropriate subfolder under `src/commands/`
2. Export an object with `data` (SlashCommandBuilder) and `execute` function
3. Deploy commands using 

```bash
node src/utils/command-deploy.js
```
### Adding new event listeners
1. Create your event file in the appropriate subfolder under `src/events/`
2. Export an object with `name` (event name), `once` (boolean), and `execute` function
3. The `event-loader.js` automatically loads all events from sub-folders
4. Event names must match Discord.js event names (e.g., `guildMemberAdd`, `interactionCreate`)
