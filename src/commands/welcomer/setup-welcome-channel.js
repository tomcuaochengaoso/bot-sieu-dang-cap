const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, MessageFlags } = require('discord.js')
const WelcomeChannel = require('../../models/WelcomeChannel')

const data = new SlashCommandBuilder()
    .setName('set-welcome-channel')
    .setDescription('Setup a channel to send welcome message to new members')
    // .setContexts(['Guild'])
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption((option) =>
        option
            .setName('target-channel')
            .setDescription('The channel to get welcome messages')
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
            .setRequired(true)
    )
    .addStringOption((option) =>
        option
            .setName('custom-message')
            .setDescription('{mention-member} {username} {server-name}')
    );
module.exports = {
    data,
    async execute(interaction) {
        try {
            const targetChannel = interaction.options.getChannel('target-channel');
            const customMessage =
                interaction.options.getString('custom-message') ||
                'Welcome {mention-member} to **{server-name}**!';

            await interaction.deferReply({
                flags: MessageFlags.Ephemeral
            });

            const query = { 
                guildId: interaction.guildId,
                channelId: targetChannel.id, 
            };
            
            const exists = await WelcomeChannel.exists(query);

            if (exists) {
                interaction.followUp('This channel has already been configured to send welcome messages');
                return;
            }

            const newWelcomeChannel = new WelcomeChannel({
                ...query,
                customMessage
            });

            newWelcomeChannel.save()
                .then(() =>
                    interaction.followUp(`Configured ${targetChannel} to send welcome messages`)
                )
                .catch((error) => {
                    interaction.followUp(`DB error. Check console logs for more details`);
                    console.log(`DB error in ${__filename}\n`, error)
                });
                
        } catch (error) {    
            console.log(`Error setting up welcome channel in ${__filename}:\n`, error);
        }
    }
}
