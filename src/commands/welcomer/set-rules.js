const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const WelcomeConfig = require('../../models/WelcomeChannel');

/**
 * @deprecated This command is no longer used, remove it later
 */
module.exports = {
    data: new SlashCommandBuilder()
        .setName('set-rules')
        .setDescription('Set the rules text for this server')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption(option =>
            option
                .setName('text')
                .setDescription('The rules content')
                .setRequired(true)
        ),

    async execute(interaction) {
        const text = interaction.options.getString('text');
        const guildId = interaction.guild.id;

        await interaction.deferReply({ 
            flags: MessageFlags.Ephemeral
        });

        let config;

        try {
            config = await WelcomeConfig.findOneAndUpdate(
                { guildId },
                { guildId, rulesMessage: text },
                { new: true, upsert: true }
            );
        } catch (err) {
            console.error(`Error updating rules text in file ${__filename}:`, err);
            return interaction.editReply({
                content: 'Failed to update rules text. Please try again later.',
            });
        }

        if (!config) {
            return interaction.editReply({
                content: 'Something went wrong. Could not create the rules config.',
            });
        }

        await interaction.followUp({
            content: '📘 Rule text has been updated!',
            flags: MessageFlags.Ephemeral
        });
    }
};
