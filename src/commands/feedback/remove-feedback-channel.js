const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, MessageFlags } = require('discord.js');
const FeedbackChannel = require('../../models/FeedbackChannel');

const data = new SlashCommandBuilder()
    .setName('remove-feedback-channel')
    .setDescription('Remove the feedback channel configuration')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption((option) => 
        option
            .setName('target-channel')
            .setDescription('The channel to remove feedback configuration from')
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

            if (!exists) {
                interaction.followUp('The channel inputted has not been configured to receive feedback');
                return;
            }
            
            FeedbackChannel.findOneAndDelete(query)
            .then(() => {
                interaction.followUp(`Removed ${targetChannel} from receiving feedback submissions`);
            })
            .catch((error) => {
                interaction.followUp(`DB error. Check console logs for more details`);
                console.log(`DB error in ${__filename}\n`, error);
            });

        } catch (error) {
            console.log(`Error removing feedback channel in ${__filename}:\n`, error);
        }
    }
};