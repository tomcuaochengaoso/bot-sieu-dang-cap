const { SlashCommandBuilder } = require('discord.js');
const feedbackModal = require('../../models/Feedback-modal');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('feedback')
        .setDescription('Leave feedback for the server'),

    async execute(interaction) {
        await interaction.showModal(feedbackModal.build());
    }
};
