const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const Feedback = require('./Feedback');

module.exports = {
    id: 'feedback_modal',

    build() {
        const modal = new ModalBuilder()
            .setCustomId(this.id)
            .setTitle('Leave Feedback');

        const feedbackInput = new TextInputBuilder()
            .setCustomId('feedback_text')
            .setLabel('Tell us what we could improve')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true);

        const actionRow = new ActionRowBuilder().addComponents(feedbackInput);

        modal.addComponents(actionRow);
        return modal;
    },

    async execute(interaction) {
        try {
            const feedbackText = interaction.fields.getTextInputValue('feedback_text');

            // Save feedback to MongoDB
            const feedback = new Feedback({
                userId: interaction.user.id,
                userTag: interaction.user.tag,
                message: feedbackText,
                guildId: interaction.guildId || null,
                guildName: interaction.guild?.name || null
            });

            await feedback.save();

            await interaction.reply({
                content: 'Thanks for your feedback! It has been recorded.',
                ephemeral: true
            });
        } catch (error) {
            console.error('Error in feedback modal:', error);
            await interaction.reply({
                content: 'There was an error submitting your feedback. Please try again later.',
                ephemeral: true
            });
        }
    }
};