const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const data = new SlashCommandBuilder()
    .setName('send-feedback')
    .setDescription('Send a feedback request to a specific user via DM')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addUserOption(option =>
        option
            .setName('user')
            .setDescription('The user to request feedback from')
            .setRequired(true)
    )
    .addStringOption(option =>
        option
            .setName('message')
            .setDescription('Optional custom message to include')
            .setRequired(false)
    );

module.exports = {
    data,
    async execute(interaction) {
        try {
            await interaction.deferReply({ ephemeral: true });

            const targetUser = interaction.options.getUser('user');
            const customMessage = interaction.options.getString('message');

            // Check if the user is a bot
            if (targetUser.bot) {
                return interaction.followUp({
                    content: 'You cannot send feedback requests to bots.',
                    ephemeral: true
                });
            }

            // Create button to open feedback modal
            const button = new ButtonBuilder()
                .setCustomId('leave_feedback')
                .setLabel('Leave Feedback')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('📝');

            const row = new ActionRowBuilder().addComponents(button);

            // Create an embed for the feedback request
            const embed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle('We\'d love your feedback!')
                .setDescription(
                    customMessage || 
                    'We noticed you left the server. We\'d really appreciate if you could share your feedback to help us improve!'
                )
                .addFields(
                    { name: 'From', value: `${interaction.guild.name}`, inline: true }
                )
                .setTimestamp()
                .setFooter({ text: 'Click the button below to leave feedback' });

            // Try to send DM to the user
            try {
                await targetUser.send({ 
                    embeds: [embed],
                    components: [row]
                });
                
                await interaction.followUp({
                    content: `Feedback request successfully sent to ${targetUser.tag}!`,
                    ephemeral: true
                });
            } catch (dmError) {
                // User has DMs disabled
                await interaction.followUp({
                    content: `Could not send feedback request to ${targetUser.tag}. They may have DMs disabled.`,
                    ephemeral: true
                });
            }

        } catch (error) {
            console.log(`Error in send-feedback command: ${error}`);
            await interaction.followUp({
                content: 'There was an error sending the feedback request.',
                ephemeral: true
            });
        }
    }
};