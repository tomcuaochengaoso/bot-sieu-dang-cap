const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const WelcomeConfig = require('../../models/WelcomeChannel');

/**
 * @deprecated This command is no longer used, remove it later
 */
module.exports = {
    data: new SlashCommandBuilder()
        .setName('set-guide')
        .setDescription('Set the guide text for this server')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption(option =>
            option
                .setName('text')
                .setDescription('The guide content')
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
                { guildId, guideMessage: text },
                { new: true, upsert: true }
            );
        } catch (err) {
            console.error(`Error updating guide text in file ${__filename}:`, err);
            return interaction.editReply({
                content: 'Failed to update guide text. Please try again later.',
            });
        }        

        if (!config) {
            return interaction.editReply({
                content: 'Something went wrong. Could not create the guide config.',
            });
        }

        await interaction.followUp({
            content: 'Guide text has been updated!',
            flags: MessageFlags.Ephemeral
        });
    }
};
