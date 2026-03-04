const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    name: 'guildMemberRemove',
    once: false,

    /**
     * @param {import("discord.js").GuildMember} member
     */
    async execute(member) {
        try {
            if (!member.user || member.user.bot) return;

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('leave_feedback')
                    .setLabel('Leave Feedback')
                    .setStyle(ButtonStyle.Primary),

                new ButtonBuilder()
                    .setCustomId('skip_feedback')
                    .setLabel('No Thanks')
                    .setStyle(ButtonStyle.Secondary)
            );

            await member.user.send({
                content: `Sorry to see you leave **${member.guild.name}**. Would you like to leave feedback?`,
                components: [row],
            });

        } catch (err) {
            // Happens if user's DMs are closed
            console.log(`Could not send goodbye DM:`, err.message);
        }
    },
};
