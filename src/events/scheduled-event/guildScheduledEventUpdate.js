const scheduledEvent = require('../../models/scheduled-event');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, GuildScheduledEventStatus } = require('discord.js');

module.exports = {
    name: 'guildScheduledEventUpdate',
    once: false,

    /**
     * @param {import('discord.js').GuildScheduledEvent} oldEvent
     * @param {import('discord.js').GuildScheduledEvent} newEvent
     * @param {import('discord.js').Client} client
     */
    async execute(oldEvent, newEvent, client) {
        console.log('[DEBUG] guildScheduledEventUpdate triggered');
        console.log(`[DEBUG] Event: ${newEvent.name}, Event ID: ${newEvent.id}`);
        console.log(`[DEBUG] Old Status: ${oldEvent.status}, New Status: ${newEvent.status}`);
        
        try {
            // Check if event just completed
            if (oldEvent.status !== GuildScheduledEventStatus.Completed && 
                newEvent.status === GuildScheduledEventStatus.Completed) {
                
                console.log(`[DEBUG] Event ${newEvent.name} just completed, processing feedback requests`);
                
                // Update or create event in database
                let eventDoc = await scheduledEvent.findOne({ eventId: newEvent.id });
                
                if (!eventDoc) {
                    console.log(`[DEBUG] Event ${newEvent.id} not found, creating new document`);
                    eventDoc = new scheduledEvent({
                        eventId: newEvent.id,
                        guildId: newEvent.guildId,
                        eventName: newEvent.name,
                        status: 'completed',
                        participants: []
                    });
                } else {
                    eventDoc.status = 'completed';
                    await eventDoc.save();
                }

                const participants = eventDoc.participants || [];
                
                if (participants.length === 0) {
                    console.log('[DEBUG] No participants to send feedback request to');
                    return;
                }

                console.log(`[DEBUG] Sending feedback requests to ${participants.length} participants`);

                // Create persistent button
                const row = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId(`feedback_event_${newEvent.id}`)
                            .setLabel('📝 Leave Feedback')
                            .setStyle(ButtonStyle.Primary)
                    );

                const messageContent = `Thanks for participating in **${newEvent.name}**! We'd love to hear your feedback.`;

                // Send to each participant
                for (const userId of participants) {
                    try {
                        const user = await client.users.fetch(userId);
                        
                        // Try DM first
                        try {
                            await user.send({
                                content: messageContent,
                                components: [row]
                            });
                            console.log(`[DEBUG] Sent feedback request to ${user.tag} via DM`);
                        } catch (dmError) {
                            // DM failed, try channel mention as fallback
                            console.log(`[DEBUG] Could not DM ${user.tag}, falling back to channel`);
                            
                            if (newEvent.channel) {
                                await newEvent.channel.send({
                                    content: `<@${userId}> ${messageContent}`,
                                    components: [row]
                                });
                            }
                        }
                        await new Promise(resolve => setTimeout(resolve, 5000));
                    } catch (error) {
                        console.error(`[DEBUG] Error sending feedback request to user ${userId}:`, error);
                    }
                }
            } else {
                // Update event status in database for other status changes
                const eventDoc = await scheduledEvent.findOne({ eventId: newEvent.id });
                if (eventDoc) {
                    let status = 'scheduled';
                    if (newEvent.status === GuildScheduledEventStatus.Active) {
                        status = 'active';
                    } else if (newEvent.status === GuildScheduledEventStatus.Completed) {
                        status = 'completed';
                    } else if (newEvent.status === GuildScheduledEventStatus.Canceled) {
                        status = 'cancelled';
                    }
                    eventDoc.status = status;
                    await eventDoc.save();
                }
            }
        } catch (error) {
            console.error('[ERROR] Error in guildScheduledEventUpdate:', error);
        }
    },
};