const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');

const data = new SlashCommandBuilder()
    .setName('simulate-leave')
    .setDescription('Simulate a member leaving the server.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addUserOption(option =>
        option
            .setName('target-user')
            .setDescription('The user you want to emulate leaving.')
            .setRequired(false)
  );

module.exports = {
    data,
    /**
     * @param {import('discord.js').ChatInputCommandInteraction} interaction
     * @param {import('discord.js').Client} client
     */
        async execute(interaction) {
        try {
            const targetUser = interaction.options.getUser('target-user');

            let member;

            if (targetUser) {
            // try cache first, then fetch
                member =
                    interaction.guild.members.cache.get(targetUser.id) ||
                    (await interaction.guild.members.fetch(targetUser.id));
            } else {
            // default to the user running the command
                member = interaction.member;
            }

            // Emit guildMemberRemove event artificially
            interaction.client.emit('guildMemberRemove', member);

            await interaction.reply({
                content: `Simulated leave for ${member.user.tag}!`,
                flags: MessageFlags.Ephemeral,
            });

        } catch (error) {
            console.error(`Error in ${__filename}:`, error);
            await interaction.reply({
                content: 'An error occurred while trying to simulate a leave.',
                flags: MessageFlags.Ephemeral,
            });
        }
    }
};
