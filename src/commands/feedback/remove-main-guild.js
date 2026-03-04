const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const MainGuild = require('../../models/MainGuild');

const data = new SlashCommandBuilder()
    .setName('remove-main-guild')
    .setDescription('Remove main guild configuration (DM feedback will not be posted)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

module.exports = {
    data,
    async execute(interaction) {
        try {
            await interaction.deferReply({ ephemeral: true });

            // Check if main guild is configured
            const mainGuildConfig = await MainGuild.findOne({ _id: 'main' });

            if (!mainGuildConfig) {
                return interaction.followUp({
                    content: 'No main guild is currently configured.\nUse `/set-main-guild` to set one.',
                    ephemeral: true
                });
            }

            // Get guild name before deleting (for confirmation message)
            let guildName = 'Unknown Server';
            try {
                const guild = await interaction.client.guilds.fetch(mainGuildConfig.guildId);
                guildName = guild.name;
            } catch (error) {
                // Guild might not exist anymore, use ID instead
                guildName = `Server ID: ${mainGuildConfig.guildId}`;
            }

            // Delete the main guild configuration
            await MainGuild.deleteOne({ _id: 'main' });

            await interaction.followUp({
                content: `Removed **${guildName}** as the main server.\n\n` +
                         `DM feedback will no longer be auto-posted until you set a new main guild with \`/set-main-guild\`.`,
                ephemeral: true
            });

        } catch (error) {
            console.error('Error in remove-main-guild command:', error);
            await interaction.followUp({
                content: 'There was an error removing the main guild configuration. Check console logs.',
                ephemeral: true
            });
        }
    }
};
