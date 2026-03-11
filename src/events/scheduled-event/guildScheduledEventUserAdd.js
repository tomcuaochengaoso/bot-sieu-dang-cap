const scheduledEvent = require('../../models/scheduled-event');

module.exports = {
    name: 'guildScheduledEventUserAdd',
    once: false,

    /**
     * @param {import('discord.js').GuildScheduledEvent} event
     * @param {import('discord.js').User} user
     */

    async execute(event, user) {
        try {
            const scheduledEventData = await scheduledEvent.findOne({
                eventId: event.id
            })

            if (!scheduledEventData.participants.includes(user.id)) {
                scheduledEventData.participants.push(user.id);
                await scheduledEventData.save();
            }

        } catch (error) {
            console.error('[ERROR] Error in guildScheduledEventUserAdd event:', error);
        }
    },
};