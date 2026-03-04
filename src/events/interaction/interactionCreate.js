const { MessageFlags } = require('discord.js');
const feedbackModal = require('../../models/Feedback-modal.js');
const WelcomeChannel = require('../../models/WelcomeChannel.js')

module.exports = {
    name: 'interactionCreate',
    once: false,

    /**
     * @param {import("discord.js").Interaction} interaction
     * @param {import("discord.js").Client} client
     */
    async execute(interaction, client) {
        try {
            if (interaction.isButton()) {
                try {
                    if (interaction.customId === 'leave_feedback') {
                        return await interaction.showModal(feedbackModal.build());
                    }

                    if (interaction.customId === 'skip_feedback') {
                        await interaction.deferReply({ ephemeral: true });
                        return await interaction.followUp({
                            content: 'Thanks anyway! Hope to see you again.',
                            flags: MessageFlags.Ephemeral
                        });
                    }

                    if (interaction.customId.startsWith("feedback_")) {
                        return await interaction.showModal(feedbackModal.build());
                    }
                    
                    if (interaction.customId.startsWith('guide_') || 
                        interaction.customId.startsWith('rules_') || 
                        interaction.customId.startsWith('role_')) {
                        
                        const guildId = interaction.guildId;
                        const config = await WelcomeChannel.findOne({ guildId }).catch(() => null);

                        if (!config) {
                            await interaction.deferReply({ ephemeral: true });
                            return await interaction.followUp({
                                content: '⚠️ This server has no welcome configuration set.',
                                flags: MessageFlags.Ephemeral
                            });
                        }

                        if (interaction.customId === `guide_${guildId}`) {
                            await interaction.deferReply({ ephemeral: true });
                            return await interaction.followUp({
                                content: `📘 **Server Guide:**\n${config.guideMessage}`,
                                flags: MessageFlags.Ephemeral
                            });
                        }

                        if (interaction.customId === `rules_${guildId}`) {
                            await interaction.deferReply({ ephemeral: true });
                            return await interaction.followUp({
                                content: `📜 **Server Rules:**\n${config.rulesMessage}`,
                                flags: MessageFlags.Ephemeral
                            });
                        }

                        if (interaction.customId === `role_${guildId}`) {
                            await interaction.deferReply({ ephemeral: true });
                            const role = interaction.guild.roles.cache.get(config.roleId);
                            
                            if (!role) {
                                return await interaction.followUp({
                                    content: "⚠️ Demo role is not configured or no longer exists.",
                                    flags: MessageFlags.Ephemeral
                                });
                            }

                            await interaction.member.roles.add(role).catch(() => null);
                            return await interaction.followUp({
                                content: `🎖️ You've been given the **${role.name}** role!`,
                                flags: MessageFlags.Ephemeral
                            });
                        }
                    }
                } catch (error) {
                    console.error('[ERROR] Error handling button interaction:', error);
                    
                    // Try to reply if interaction hasn't been replied to
                    if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
                        try {
                            await interaction.reply({
                                content: 'There was an error processing your request. Please try again later.',
                                ephemeral: true
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
                                ephemeral: true
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
                                ephemeral: true
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