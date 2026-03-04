const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const Feedback = require('../../models/Feedback');
const FeedbackChannel = require('../../models/FeedbackChannel');

const data = new SlashCommandBuilder()
    .setName('view-feedback')
    .setDescription('View recent feedback submissions')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addIntegerOption(option =>
        option
            .setName('count')
            .setDescription('Number of recent feedbacks to display (default: 10)')
            .setMinValue(1)
            .setMaxValue(25)
            .setRequired(false)
    )
    .addStringOption(option =>
        option
            .setName('filter')
            .setDescription('Filter feedback by source')
            .addChoices(
                { name: 'Server + DMs', value: 'all' },
                { name: 'Server Only', value: 'server' },
                { name: 'DMs Only', value: 'dm' }
            )
            .setRequired(false)
    );

module.exports = {
    data,
    async execute(interaction) {
        try {
            await interaction.deferReply({ ephemeral: true });

            // Check if feedback channel is configured
            const feedbackChannelData = await FeedbackChannel.findOne({
                guildId: interaction.guildId
            });

            if (!feedbackChannelData) {
                return interaction.followUp({
                    content: 'No feedback channel has been configured for this server. Use `/setup-feedback-channel` first.',
                    ephemeral: true
                });
            }

            const feedbackChannel = await interaction.client.channels.fetch(
                feedbackChannelData.channelId
            ).catch(() => null);

            if (!feedbackChannel) {
                return interaction.followUp({
                    content: 'The configured feedback channel no longer exists or I don\'t have access to it.',
                    ephemeral: true
                });
            }

            const count = interaction.options.getInteger('count') || 10;
            const filter = interaction.options.getString('filter') || 'all';

            // FIXED: Build query to only show THIS server's feedback + DMs
            let query = {};
            if (filter === 'server') {
                // Only this server's feedback
                query.guildId = interaction.guildId;
            } else if (filter === 'dm') {
                // Only DM feedback
                query.guildId = null;
            } else {
                // 'all' = This server + DMs (not other servers)
                query.$or = [
                    { guildId: interaction.guildId },
                    { guildId: null }
                ];
            }

            // Fetch recent feedbacks from MongoDB
            const feedbacks = await Feedback.find(query)
                .sort({ createdAt: -1 })
                .limit(count);

            if (feedbacks.length === 0) {
                return interaction.followUp({
                    content: 'No feedback found matching your criteria.',
                    ephemeral: true
                });
            }

            // Send feedbacks to the configured channel
            for (const feedback of feedbacks) {
                const embed = new EmbedBuilder()
                    .setColor('#0099ff')
                    .setTitle('📋 Feedback')
                    .setDescription(feedback.message)
                    .addFields(
                        { name: 'User', value: `${feedback.userTag} (${feedback.userId})`, inline: true },
                        { name: 'Source', value: feedback.guildName || 'DM', inline: true }
                    )
                    .setTimestamp(feedback.createdAt)
                    .setFooter({ text: 'ID: ' + feedback._id });

                await feedbackChannel.send({ embeds: [embed] });
            }

            await interaction.followUp({
                content: `Posted ${feedbacks.length} recent feedback(s) to ${feedbackChannel}.`,
                ephemeral: true
            });

        } catch (error) {
            console.log(`Error viewing feedback in ${__filename}:\n`, error);
            await interaction.followUp({
                content: 'There was an error retrieving feedback. Check console logs.',
                ephemeral: true
            });
        }
    }
};