const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, MessageFlags } = require('discord.js');
const WelcomeChannel = require('../../models/WelcomeChannel');

const data = new SlashCommandBuilder()
    .setName('welcome')
    .setDescription('Welcome system management')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub => sub
        .setName('setup')
        .setDescription('Setup or update a welcome channel and message')
        .addChannelOption(opt => opt
            .setName('channel')
            .setDescription('The channel for welcome messages')
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
            .setRequired(true))
        .addStringOption(opt => opt
            .setName('message')
            .setDescription('Custom message ({mention-member} {username} {server-name})')))
    .addSubcommand(sub => sub
        .setName('remove')
        .setDescription('Remove a welcome channel configuration')
        .addChannelOption(opt => opt
            .setName('channel')
            .setDescription('The channel to remove')
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
            .setRequired(true)))
    .addSubcommand(sub => sub
        .setName('simulate')
        .setDescription('Simulate a member joining or leaving')
        .addStringOption(opt => opt
            .setName('type')
            .setDescription('Simulate join or leave')
            .setRequired(true)
            .addChoices(
                { name: 'Join', value: 'join' },
                { name: 'Leave', value: 'leave' }
            ))
        .addUserOption(opt => opt
            .setName('user')
            .setDescription('User to simulate (defaults to yourself)')));

module.exports = {
    data,
    async execute(interaction) {
        const sub = interaction.options.getSubcommand();

        if (sub === 'setup') return handleSetup(interaction);
        if (sub === 'remove') return handleRemove(interaction);
        if (sub === 'simulate') return handleSimulate(interaction);
    }
};

async function handleSetup(interaction) {
    const channel = interaction.options.getChannel('channel');
    const customMessage = interaction.options.getString('message') || 'Welcome {mention-member} to **{server-name}**!';

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
        await WelcomeChannel.findOneAndUpdate(
            { guildId: interaction.guildId, channelId: channel.id },
            { guildId: interaction.guildId, channelId: channel.id, customMessage },
            { upsert: true, new: true }
        );

        await interaction.followUp(`Configured ${channel} to send welcome messages.`);
    } catch (error) {
        console.error('Error setting up welcome channel:', error);
        await interaction.followUp('Failed to configure welcome channel. Check console logs.');
    }
}

async function handleRemove(interaction) {
    const channel = interaction.options.getChannel('channel');

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
        const deleted = await WelcomeChannel.findOneAndDelete({
            guildId: interaction.guildId,
            channelId: channel.id,
        });

        if (!deleted) {
            return await interaction.followUp('That channel is not configured for welcome messages.');
        }

        await interaction.followUp(`Removed ${channel} from sending welcome messages.`);
    } catch (error) {
        console.error('Error removing welcome channel:', error);
        await interaction.followUp('Failed to remove welcome channel. Check console logs.');
    }
}

async function handleSimulate(interaction) {
    const type = interaction.options.getString('type');
    const targetUser = interaction.options.getUser('user');

    try {
        let member;
        if (targetUser) {
            member = interaction.guild.members.cache.get(targetUser.id)
                || await interaction.guild.members.fetch(targetUser.id);
        } else {
            member = interaction.member;
        }

        const event = type === 'join' ? 'guildMemberAdd' : 'guildMemberRemove';
        interaction.client.emit(event, member);

        await interaction.reply({
            content: `Simulated ${type} for ${member.user.tag}!`,
            flags: MessageFlags.Ephemeral,
        });
    } catch (error) {
        console.error('Error in simulate command:', error);
        await interaction.reply({
            content: `Failed to simulate ${type}. Check console logs.`,
            flags: MessageFlags.Ephemeral,
        });
    }
}
