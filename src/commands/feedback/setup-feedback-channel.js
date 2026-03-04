const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, MessageFlags } = require('discord.js');
const FeedbackChannel = require('../../models/FeedbackChannel');

const data = new SlashCommandBuilder()
    .setName('set-feedback-channel')
    .setDescription('Setup a channel to receive feedback submissions')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption((option) =>
        option
            .setName('target-channel')
            .setDescription('The channel where feedback will be sent')
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
            
            const exists = await FeedbackChannel.exists(query);

            if (exists) {
                interaction.followUp('This channel has already been configured for this server');
                return;
            }

            const newFeedbackChannel = new FeedbackChannel({
                ...query
            });

            newFeedbackChannel.save()
                .then(() =>
                    interaction.followUp(`Configured ${targetChannel} to receive feedback submissions`)
                )
                .catch((error) => {
                    interaction.followUp(`DB error. Check console logs for more details`);
                    console.log(`DB error in ${__filename}\n`, error);
                });
                
        } catch (error) {    
            console.log(`Error setting up feedback channel in ${__filename}:\n`, error);
        }
    }
};