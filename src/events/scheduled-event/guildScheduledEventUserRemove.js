const scheduledEvent = require('../../models/scheduled-event');

module.exports = {
    name: 'guildScheduledEventUserRemove',
    once: false,

    /**
     * @param {import('discord.js').GuildScheduledEvent} event
     * @param {import('discord.js').User} user
     */
    async execute(event, user) {
        try {
            const scheduledEventData = await scheduledEvent.findOne({
                eventId: event.id
            });

            if (scheduledEventData && scheduledEventData.participants.includes(user.id)) {
                scheduledEventData.participants = scheduledEventData.participants.filter(id => id !== user.id);
                await scheduledEventData.save();
            }
        } catch (error) {
            console.error('[ERROR] Error in guildScheduledEventUserRemove event:', error);
        }
    }
};