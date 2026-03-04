const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const data = new SlashCommandBuilder()
    .setName('send-modal-to-all')
    .setDescription('Send a modal request to all users via DM')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
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

            const customMessage = interaction.options.getString('message');
            const guild = interaction.guild;

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
                .setTitle('Placeholder title!')
                .setDescription(
                    customMessage || 
                    'Placeholder message'
                )
                .addFields(
                    { name: 'From', value: `${interaction.guild.name}`, inline: true }
                )
                .setTimestamp()
                .setFooter({ text: 'Click the button below to leave feedback' });

            await interaction.followUp({
                content: 'Fetching every guild members, this could take a few minutes depending on server size...',
                ephemeral: true
            })

    
            await guild.members.fetch(); // Fetch all members

            const members = guild.members.cache.filter(m => !m.user.bot && !m.user.system);
            const totalMembers = members.size;

            let success = 0;
            let fail = 0;
            
            // Try to send DM to all users if applicable
            for (const member of members.values()) {
                try {
                    await member.user.send({
                        embeds: [embed],
                        components: [row]
                    });
                    success++;
                    
                    // Add delay to avoid rate limiting
                    await new Promise(resolve => setTimeout(resolve, 1000));
                } catch (err) {
                    fail++;
                }
            }

            await interaction.followUp({
                content: `Feedback request complete!\n Sent: ${success}\n Failed: ${fail}\n`,
                ephemeral: true
            });

        } catch (error) {
            console.log(`Error in send-feedback command: ${error}`);
            await interaction.followUp({
                content: 'There was an error sending the feedback request.',
                ephemeral: true
            });
        }
    }
};