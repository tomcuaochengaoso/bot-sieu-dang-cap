const { Schema, model } = require('mongoose');

const feedbackChannelSchema = new Schema({
    guildId: {
        type: String,
        required: true
    },
    channelId: {
        type: String,
        required: true,
        unique: true
    }
});

module.exports = model('FeedbackChannel', feedbackChannelSchema);