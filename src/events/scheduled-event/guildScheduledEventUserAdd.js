const scheduledEvent = require('../../models/scheduled-event');

module.exports = {
    name: 'guildScheduledEventUserAdd',
    once: false,

    /**
     * @param {import('discord.js').GuildScheduledEvent} event
     * @param {import('discord.js').User} user
     */

    async execute(event, user) {
        console.log('[DEBUG] guildScheduledEventUserAdd event triggered');
        console.log(`[DEBUG] User ${user.tag} has joined event ${event.name}`);

        try {
            const scheduledEventData = await scheduledEvent.findOne({
                eventId: event.id
            })

            if (!scheduledEventData.participants.includes(user.id)) {
                scheduledEventData.participants.push(user.id);
                await scheduledEventData.save();
                console.log(`[DEBUG] User ${user.tag} has been added to the event ${event.name}`);
            } else {
                console.log(`[DEBUG] User ${user.tag} is already in the event ${event.name}`);
            }

        } catch (error) {
            console.error('[ERROR] Error in guildScheduledEventUserAdd event:', error);
        }
    },
};