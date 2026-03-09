const { Schema, model } = require('mongoose');
const { EmbedBuilder } = require('discord.js');

const feedbackSchema = new Schema({
    userId: {
        type: String,
        required: true
    },
    userTag: {
        type: String,
        required: true
    },
    guildId: {
        type: String,
        default: null
    },
    guildName: {
        type: String,
        default: null
    },
    message: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

feedbackSchema.post('save', async function(doc) {
    try {
        // Import here to avoid circular dependency
        const FeedbackChannel = require('./FeedbackChannel');
        
        // Get the bot client instance from global
        const client = global.discordClient;
        
        if (!client) {
            console.log('Discord client not available for auto-posting feedback');
            return;
        }

        let feedbackChannelData = null;

        if (doc.guildId) {
            // Server feedback: Find the feedback channel for THIS specific server
            feedbackChannelData = await FeedbackChannel.findOne({
                guildId: doc.guildId
            });

            if (!feedbackChannelData) {
                console.log(`No feedback channel configured for guild ${doc.guildId}`);
                return;
            }
        } else {
            // DM feedback: Post only to main server's feedback channel
            const MainGuild = require('./MainGuild');
            const mainGuildConfig = await MainGuild.findOne({ _id: 'main' });
            
            if (!mainGuildConfig) {
                console.log('No main guild configured - use /feedback set-main-guild');
                return;
            }

            feedbackChannelData = await FeedbackChannel.findOne({
                guildId: mainGuildConfig.guildId
            });

            if (!feedbackChannelData) {
                console.log(`No feedback channel configured for main guild ${mainGuildId}`);
                return;
            }
        }

        try {
            const channel = await client.channels.fetch(feedbackChannelData.channelId).catch(() => null);
            
            if (!channel) {
                console.log(`Feedback channel ${feedbackChannelData.channelId} not found`);
                return;
            }

            // Create embed for the new feedback
            const embed = new EmbedBuilder()
                .setColor(doc.guildId ? '#00ff00' : '#ffaa00') // Green for server, Orange for DM
                .setTitle(doc.guildId ? 'New Feedback Received' : 'New DM Feedback')
                .setDescription(doc.message)
                .addFields(
                    { name: 'User', value: `${doc.userTag} (${doc.userId})`, inline: true },
                    { name: 'Source', value: doc.guildName || 'DM', inline: true }
                )
                .setTimestamp(doc.createdAt)
                .setFooter({ text: 'Feedback ID: ' + doc._id });

            await channel.send({ embeds: [embed] });
            console.log(`Posted ${doc.guildId ? 'server' : 'DM'} feedback ${doc._id} to channel ${feedbackChannelData.channelId}`);
            
        } catch (error) {
            console.error(`Error posting feedback to channel ${feedbackChannelData.channelId}:`, error);
        }

    } catch (error) {
        console.error('Error in feedback post-save hook:', error);
    }
});

module.exports = model('Feedback', feedbackSchema);