const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, MessageFlags } = require('discord.js');
const WelcomeChannel = require('../../models/WelcomeChannel');

const data = new SlashCommandBuilder()
    .setName('remove-welcome-channel')
    .setDescription('Remove a target welcome channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    // .setContexts(['Guild'])
    .addChannelOption((option) => 
        option
            .setName('target-channel')
            .setDescription('The channel to remove channel messages from.')
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
            .setRequired(true)
    );

module.exports = {
    data,
    async execute(interaction) {
        try {
            const targetChannel = interaction.options.getChannel('target-channel');

            await interaction.deferReply({
                flags: MessageFlags.Ephemeral
            });

            const query = { 
                guildId: interaction.guildId,
                channelId: targetChannel.id, 
            };

            const exists = await WelcomeChannel.exists(query);

            if (!exists) {
                interaction.followUp('The channel inputted has not been configured to send welcome messages')
                return;
            };
            
            WelcomeChannel.findOneAndDelete(query)
            .then(() => {
                interaction.followUp(`Removed ${targetChannel} from receiving welcome messages`)
            })
            .catch((error) => {
                interaction.followUp(`DB error. Check console logs for more details`);
                console.log(`DB error in ${__filename}\n`, error)
            });

        } catch (error) {
            console.log(`Error removing welcome channel in ${__filename}:\n`, error);
        }
    }
};