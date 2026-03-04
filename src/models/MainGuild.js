const { Schema, model } = require('mongoose');

const mainGuildSchema = new Schema({
    _id: {
        type: String,
        default: 'main'
    },
    guildId: {
        type: String,
        required: true
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = model('MainGuild', mainGuildSchema);