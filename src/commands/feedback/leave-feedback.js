const { SlashCommandBuilder } = require('discord.js');
const feedbackModal = require('../../models/Feedback-modal.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('feedback')
        .setDescription('Leave feedback for the server'),

    async execute(interaction) {
        const modal = feedbackModal.build();
        await interaction.showModal(modal);
    }
};