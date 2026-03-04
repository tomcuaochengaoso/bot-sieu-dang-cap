const { Schema, model } = require('mongoose')

const welcomeChannelSchema = new Schema(
    {
        guildId: {
            type: String,
            required: true,
        },
        channelId: {
            type: String,
            required: true,
            unique: true
        },
        customMessage: {
            type: String,
            default: null
        },
        /**
         * @deprecated This field is no longer used, remove it later
         */
        guideMessage: {
            type: String,
            default: 'No guide yet'
        },
        /**
         * @deprecated This field is no longer used, remove it later
         */
        rulesMessage: {
            type: String,
            default: 'No rules yet'
        },
        /**
         * @deprecated This field is no longer used, remove it later
         */
        roleId: {
            type: String,
            default: null
        }
    },
    { 
        timestamps: true
    }
);

module.exports = model('WelcomeChannel', welcomeChannelSchema);