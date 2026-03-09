const {
    SlashCommandBuilder, PermissionFlagsBits, ChannelType, MessageFlags,
    EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
} = require('discord.js');
const Feedback = require('../../models/Feedback');
const FeedbackChannel = require('../../models/FeedbackChannel');
const MainGuild = require('../../models/MainGuild');

const data = new SlashCommandBuilder()
    .setName('feedback-manage')
    .setDescription('Manage the feedback system')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub => sub
        .setName('view')
        .setDescription('View recent feedback submissions')
        .addIntegerOption(opt => opt
            .setName('count')
            .setDescription('Number to display (default: 10)')
            .setMinValue(1)
            .setMaxValue(25))
        .addStringOption(opt => opt
            .setName('filter')
            .setDescription('Filter by source')
            .addChoices(
                { name: 'Server + DMs', value: 'all' },
                { name: 'Server Only', value: 'server' },
                { name: 'DMs Only', value: 'dm' }
            )))
    .addSubcommand(sub => sub
        .setName('send')
        .setDescription('Send a feedback request to a user via DM')
        .addUserOption(opt => opt
            .setName('user')
            .setDescription('The user to request feedback from')
            .setRequired(true))
        .addStringOption(opt => opt
            .setName('message')
            .setDescription('Custom message to include')))
    .addSubcommand(sub => sub
        .setName('send-all')
        .setDescription('Send a feedback request to all members via DM')
        .addStringOption(opt => opt
            .setName('message')
            .setDescription('Message to include in the feedback request')
            .setRequired(true)))
    .addSubcommand(sub => sub
        .setName('setup-channel')
        .setDescription('Setup a channel to receive feedback')
        .addChannelOption(opt => opt
            .setName('channel')
            .setDescription('The channel for feedback')
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
            .setRequired(true)))
    .addSubcommand(sub => sub
        .setName('remove-channel')
        .setDescription('Remove a feedback channel')
        .addChannelOption(opt => opt
            .setName('channel')
            .setDescription('The channel to remove')
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
            .setRequired(true)))
    .addSubcommand(sub => sub
        .setName('set-main-guild')
        .setDescription('Set which server receives DM feedback')
        .addStringOption(opt => opt
            .setName('guild-id')
            .setDescription('Server ID (leave empty for current server)')))
    .addSubcommand(sub => sub
        .setName('remove-main-guild')
        .setDescription('Remove main guild configuration'));

module.exports = {
    data,
    async execute(interaction) {
        const sub = interaction.options.getSubcommand();

        if (sub === 'view') return handleView(interaction);
        if (sub === 'send') return handleSend(interaction);
        if (sub === 'send-all') return handleSendAll(interaction);
        if (sub === 'setup-channel') return handleSetupChannel(interaction);
        if (sub === 'remove-channel') return handleRemoveChannel(interaction);
        if (sub === 'set-main-guild') return handleSetMainGuild(interaction);
        if (sub === 'remove-main-guild') return handleRemoveMainGuild(interaction);
    }
};

// --- View ---

async function handleView(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
        const feedbackChannelData = await FeedbackChannel.findOne({ guildId: interaction.guildId });

        if (!feedbackChannelData) {
            return await interaction.followUp('No feedback channel configured. Use `/feedback-manage setup-channel` first.');
        }

        const feedbackChannel = await interaction.client.channels.fetch(feedbackChannelData.channelId).catch(() => null);

        if (!feedbackChannel) {
            return await interaction.followUp('The configured feedback channel no longer exists or is inaccessible.');
        }

        const count = interaction.options.getInteger('count') || 10;
        const filter = interaction.options.getString('filter') || 'all';

        let query = {};
        if (filter === 'server') {
            query.guildId = interaction.guildId;
        } else if (filter === 'dm') {
            query.guildId = null;
        } else {
            query.$or = [
                { guildId: interaction.guildId },
                { guildId: null }
            ];
        }

        const feedbacks = await Feedback.find(query).sort({ createdAt: -1 }).limit(count);

        if (!feedbacks.length) {
            return await interaction.followUp('No feedback found matching your criteria.');
        }

        // Batch embeds (max 10 per message)
        const embeds = feedbacks.map(fb => new EmbedBuilder()
            .setColor('#0099ff')
            .setDescription(fb.message)
            .addFields(
                { name: 'User', value: `${fb.userTag} (${fb.userId})`, inline: true },
                { name: 'Source', value: fb.guildName || 'DM', inline: true }
            )
            .setTimestamp(fb.createdAt)
            .setFooter({ text: 'ID: ' + fb._id }));

        for (let i = 0; i < embeds.length; i += 10) {
            await feedbackChannel.send({ embeds: embeds.slice(i, i + 10) });
        }

        await interaction.followUp(`Posted ${feedbacks.length} feedback(s) to ${feedbackChannel}.`);
    } catch (error) {
        console.error('Error viewing feedback:', error);
        await interaction.followUp('Failed to retrieve feedback. Check console logs.');
    }
}

// --- Send ---

async function handleSend(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
        const targetUser = interaction.options.getUser('user');
        const customMessage = interaction.options.getString('message');

        if (targetUser.bot) {
            return await interaction.followUp('You cannot send feedback requests to bots.');
        }

        const { embed, row } = buildFeedbackRequest(interaction.guild.name, customMessage);

        try {
            await targetUser.send({ embeds: [embed], components: [row] });
            await interaction.followUp(`Feedback request sent to ${targetUser.tag}!`);
        } catch {
            await interaction.followUp(`Could not DM ${targetUser.tag}. They may have DMs disabled.`);
        }
    } catch (error) {
        console.error('Error in send command:', error);
        await interaction.followUp('Failed to send feedback request. Check console logs.');
    }
}

// --- Send All ---

async function handleSendAll(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
        const customMessage = interaction.options.getString('message');
        const guild = interaction.guild;
        const { embed, row } = buildFeedbackRequest(guild.name, customMessage);

        await interaction.editReply('Fetching members, this may take a moment...');

        await guild.members.fetch();
        const members = guild.members.cache.filter(m => !m.user.bot && !m.user.system);
        const total = members.size;
        let success = 0;
        let fail = 0;
        let i = 0;

        for (const member of members.values()) {
            try {
                await member.user.send({ embeds: [embed], components: [row] });
                success++;
            } catch {
                fail++;
            }
            i++;

            if (i % 20 === 0) {
                await interaction.editReply(`Progress: ${i}/${total} (${success} sent, ${fail} failed)`);
            }

            await new Promise(r => setTimeout(r, 1000));
        }

        await interaction.editReply(`Done! Sent: ${success} | Failed: ${fail} | Total: ${total}`);
    } catch (error) {
        console.error('Error in send-all command:', error);
        await interaction.editReply('Failed to send feedback requests. Check console logs.');
    }
}

// --- Setup Channel ---

async function handleSetupChannel(interaction) {
    const channel = interaction.options.getChannel('channel');

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
        await FeedbackChannel.findOneAndUpdate(
            { guildId: interaction.guildId, channelId: channel.id },
            { guildId: interaction.guildId, channelId: channel.id },
            { upsert: true, new: true }
        );

        await interaction.followUp(`Configured ${channel} to receive feedback submissions.`);
    } catch (error) {
        console.error('Error setting up feedback channel:', error);
        await interaction.followUp('Failed to configure feedback channel. Check console logs.');
    }
}

// --- Remove Channel ---

async function handleRemoveChannel(interaction) {
    const channel = interaction.options.getChannel('channel');

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
        const deleted = await FeedbackChannel.findOneAndDelete({
            guildId: interaction.guildId,
            channelId: channel.id,
        });

        if (!deleted) {
            return await interaction.followUp('That channel is not configured for feedback.');
        }

        await interaction.followUp(`Removed ${channel} from receiving feedback.`);
    } catch (error) {
        console.error('Error removing feedback channel:', error);
        await interaction.followUp('Failed to remove feedback channel. Check console logs.');
    }
}

// --- Set Main Guild ---

async function handleSetMainGuild(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
        const guildId = interaction.options.getString('guild-id') || interaction.guildId;
        const guild = await interaction.client.guilds.fetch(guildId).catch(() => null);

        if (!guild) {
            return await interaction.followUp(
                `Could not find server with ID \`${guildId}\`. Make sure the bot is in that server.`
            );
        }

        const feedbackChannel = await FeedbackChannel.findOne({ guildId });
        if (!feedbackChannel) {
            return await interaction.followUp(
                `**${guild.name}** doesn't have a feedback channel configured yet.\n` +
                `Run \`/feedback-manage setup-channel\` in that server first.`
            );
        }

        await MainGuild.findOneAndUpdate(
            { _id: 'main' },
            { guildId },
            { upsert: true, new: true }
        );

        await interaction.followUp(
            `Set **${guild.name}** as the main server. All DM feedback will be posted there.`
        );
    } catch (error) {
        console.error('Error in set-main-guild:', error);
        await interaction.followUp('Failed to set main guild. Check console logs.');
    }
}

// --- Remove Main Guild ---

async function handleRemoveMainGuild(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
        const config = await MainGuild.findOneAndDelete({ _id: 'main' });

        if (!config) {
            return await interaction.followUp('No main guild is currently configured.');
        }

        let guildName = `Server ID: ${config.guildId}`;
        try {
            const guild = await interaction.client.guilds.fetch(config.guildId);
            guildName = guild.name;
        } catch {}

        await interaction.followUp(
            `Removed **${guildName}** as the main server. DM feedback will no longer be auto-posted.`
        );
    } catch (error) {
        console.error('Error in remove-main-guild:', error);
        await interaction.followUp('Failed to remove main guild. Check console logs.');
    }
}

// --- Helpers ---

function buildFeedbackRequest(serverName, customMessage) {
    const button = new ButtonBuilder()
        .setCustomId('leave_feedback')
        .setLabel('Leave Feedback')
        .setStyle(ButtonStyle.Primary);

    const row = new ActionRowBuilder().addComponents(button);

    const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('We\'d love your feedback!')
        .setDescription(customMessage || 'We\'d really appreciate if you could share your thoughts to help us improve!')
        .addFields({ name: 'From', value: serverName, inline: true })
        .setTimestamp()
        .setFooter({ text: 'Click the button below to leave feedback' });

    return { embed, row };
}
