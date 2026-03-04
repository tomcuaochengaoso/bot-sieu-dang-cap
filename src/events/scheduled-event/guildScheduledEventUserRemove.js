const scheduledEvent = require('../../models/scheduled-event');

module.exports = {
    name: 'guildScheduledEventUserRemove',
    once: false,

    /**
     * @param {import('discord.js').GuildScheduledEvent} event
     * @param {import('discord.js').User} user
     */
    async execute(event, user) {
        console.log('[DEBUG] guildScheduledEventUserRemove triggered');
        console.log(`[DEBUG] User: ${user.tag}, Event: ${event.name}, Event ID: ${event.id}`);
        
        try {
            const scheduledEventData = await scheduledEvent.findOne({
                eventId: event.id
            });

            if (scheduledEventData) {
                // Remove user from participants if they exist
                if (scheduledEventData.participants.includes(user.id)) {
                    scheduledEventData.participants = scheduledEventData.participants.filter(id => id !== user.id);
                    await scheduledEventData.save();
                    console.log(`[DEBUG] Removed ${user.tag} from event ${event.name} participants`);
                } else {
                    console.log(`[DEBUG] User ${user.tag} was not in participants list`);
                }
            } else {
                console.log(`[DEBUG] Event ${event.id} not found in database`);
            }

            console.log(`${user.tag} left event: ${event.name}`);
        } catch (error) {
            console.error('[ERROR] Error in guildScheduledEventUserRemove event:', error);
        }
    }
};