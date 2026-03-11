const { MessageFlags } = require('discord.js');
const feedbackModal = require('../../models/Feedback-modal.js');

module.exports = {
    name: 'interactionCreate',
    once: false,

    async execute(interaction, client) {
        try {
            if (interaction.isButton()) {
                try {
                    if (interaction.customId === 'leave_feedback' || interaction.customId.startsWith('feedback_')) {
                        return await interaction.showModal(feedbackModal.build());
                    }

                    if (interaction.customId === 'skip_feedback') {
                        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
                        return await interaction.followUp({
                            content: 'Thanks anyway! Hope to see you again.',
                            flags: MessageFlags.Ephemeral
                        });
                    }
                } catch (error) {
                    console.error('[ERROR] Error handling button interaction:', error);

                    if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
                        try {
                            await interaction.reply({
                                content: 'There was an error processing your request. Please try again later.',
                                flags: MessageFlags.Ephemeral
                            });
                        } catch (replyError) {
                            console.error('[ERROR] Failed to send error reply:', replyError);
                        }
                    } else if (interaction.deferred && !interaction.replied) {
                        try {
                            await interaction.followUp({
                                content: 'There was an error processing your request. Please try again later.',
                                flags: MessageFlags.Ephemeral
                            });
                        } catch (followUpError) {
                            console.error('[ERROR] Failed to send error followUp:', followUpError);
                        }
                    }
                }
            }

            if (interaction.isModalSubmit()) {
                try {
                    if (interaction.customId === feedbackModal.id) {
                        return await feedbackModal.execute(interaction);
                    }
                } catch (error) {
                    console.error('[ERROR] Error handling modal submission:', error);

                    if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
                        try {
                            await interaction.reply({
                                content: 'There was an error processing your feedback. Please try again later.',
                                flags: MessageFlags.Ephemeral
                            });
                        } catch (replyError) {
                            console.error('[ERROR] Failed to send error reply:', replyError);
                        }
                    }
                }
            }

            if (interaction.isChatInputCommand()) {
                const command = client.commands.get(interaction.commandName);
                if (!command) return;

                try {
                    await command.execute(interaction);
                } catch (err) {
                    console.error('[ERROR] Error executing command:', err);

                    if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
                        try {
                            await interaction.reply({
                                content: 'There was an error executing that command.',
                                flags: MessageFlags.Ephemeral
                            });
                        } catch (replyError) {
                            console.error('[ERROR] Failed to send error reply:', replyError);
                        }
                    } else if (interaction.deferred && !interaction.replied) {
                        try {
                            await interaction.followUp({
                                content: 'There was an error executing that command.',
                                flags: MessageFlags.Ephemeral
                            });
                        } catch (followUpError) {
                            console.error('[ERROR] Failed to send error followUp:', followUpError);
                        }
                    }
                }
            }
        } catch (error) {
            console.error('[ERROR] Unexpected error in interactionCreate:', error);
        }
    }
};
