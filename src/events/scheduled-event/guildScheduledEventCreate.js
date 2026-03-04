const scheduledEvent = require('../../models/scheduled-event');
const { GuildScheduledEventStatus } = require('discord.js');

module.exports = {
    name: 'guildScheduledEventCreate',
    once: false,

    /**
     * @param {import('discord.js').GuildScheduledEvent} event
     */
    async execute(event) {
        console.log('[DEBUG] guildScheduledEventCreate triggered');
        console.log(`[DEBUG] Event: ${event.name}, Event ID: ${event.id}, Guild ID: ${event.guildId}`);
        console.log(`[DEBUG] Event Status: ${event.status}`);
        
        try {
            // Check if event already exists in database (shouldn't happen, but safety check)
            const existingEvent = await scheduledEvent.findOne({
                eventId: event.id
            });

            if (existingEvent) {
                console.log(`[DEBUG] Event ${event.id} already exists in database, skipping creation`);
                return;
            }

            // Map Discord.js status to schema enum values
            let status = 'scheduled';
            if (event.status === GuildScheduledEventStatus.Active) {
                status = 'active';
            } else if (event.status === GuildScheduledEventStatus.Completed) {
                status = 'completed';
            } else if (event.status === GuildScheduledEventStatus.Canceled) {
                status = 'cancelled';
            }

            // Create new event document
            const newEventDoc = new scheduledEvent({
                eventId: event.id,
                guildId: event.guildId,
                eventName: event.name,
                status: status,
                participants: []
            });

            await newEventDoc.save();
            console.log(`[DEBUG] Created new event document for ${event.name} (${event.id}) with status: ${status}`);
            console.log(`Event created: ${event.name}`);
        } catch (error) {
            console.error('[ERROR] Error in guildScheduledEventCreate:', error);
        }
    },
};