const { Schema, model } = require('mongoose');

const scheduledEventSchema = new Schema({
    guildId: {
        type: String,
        required: true
    },
    eventId: {
        type: String,
        required: true
    },
    eventName: {
        type: String,
        required: true
    },
    status: {
        type: String,
        required: true,
        enum: ['scheduled', 'active', 'completed', 'cancelled']
    },
    participants: {
        type: [String],
        default: []
    }
});

module.exports = model('ScheduledEvent', scheduledEventSchema);