const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const MainGuild = require('../../models/MainGuild');

const data = new SlashCommandBuilder()
    .setName('set-main-guild')
    .setDescription('Set which server receives DM feedback')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(option =>
        option
            .setName('guild-id')
            .setDescription('The server ID that should receive DM feedback (leave empty to use current server)')
            .setRequired(false)
    );

module.exports = {
    data,
    async execute(interaction) {
        try {
            await interaction.deferReply({ ephemeral: true });

            // Get guild ID from option or use current server
            const guildId = interaction.options.getString('guild-id') || interaction.guildId;

            // Validate that the guild exists and bot has access
            const guild = await interaction.client.guilds.fetch(guildId).catch(() => null);

            if (!guild) {
                return interaction.followUp({
                    content: `Could not find server with ID \`${guildId}\`. Make sure:\n` +
                             `• The bot is in that server\n` +
                             `• The server ID is correct`,
                    ephemeral: true
                });
            }

            // Check if this guild has a feedback channel configured
            const FeedbackChannel = require('../../models/FeedbackChannel');
            const feedbackChannel = await FeedbackChannel.findOne({ guildId });

            if (!feedbackChannel) {
                return interaction.followUp({
                    content: `Server **${guild.name}** doesn't have a feedback channel configured yet.\n` +
                             `Please run \`/setup-feedback-channel\` in that server first.`,
                    ephemeral: true
                });
            }

            // Save or update main guild configuration
            await MainGuild.findOneAndUpdate(
                { _id: 'main' }, // Single document with fixed ID
                { guildId: guildId },
                { upsert: true, new: true }
            );

            await interaction.followUp({
                content: `Successfully set **${guild.name}** as the main server.\n` +
                         `All DM feedback will now be posted there.`,
                ephemeral: true
            });

        } catch (error) {
            console.error('Error in set-main-guild command:', error);
            await interaction.followUp({
                content: 'There was an error setting the main guild. Check console logs.',
                ephemeral: true
            });
        }
    }
};
