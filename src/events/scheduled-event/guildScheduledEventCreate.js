const scheduledEvent = require('../../models/scheduled-event');
const { GuildScheduledEventStatus } = require('discord.js');

module.exports = {
    name: 'guildScheduledEventCreate',
    once: false,

    /**
     * @param {import('discord.js').GuildScheduledEvent} event
     */
    async execute(event) {
        try {
            // Check if event already exists in database (shouldn't happen, but safety check)
            const existingEvent = await scheduledEvent.findOne({
                eventId: event.id
            });

            if (existingEvent) return;

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
            console.log(`Event created: ${event.name}`);
        } catch (error) {
            console.error('[ERROR] Error in guildScheduledEventCreate:', error);
        }
    },
};