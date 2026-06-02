const { EmbedBuilder, StringSelectMenuBuilder, ActionRowBuilder } = require('discord.js');
const { loadOnboardingConfig } = require('../../utils/onboarding-config');

const selectMenu = new StringSelectMenuBuilder()
    .setCustomId('onboarding_select')
    .setPlaceholder('🎓 Chọn chủ đề bạn muốn tìm hiểu...')
    .addOptions([
        { label: 'Giới thiệu mục đích server', value: 'server-purpose', emoji: '🎯' },
        { label: 'Hành trình onboard', value: 'onboard-journey', emoji: '🚀' },
        { label: 'Lệnh /rank', value: 'rank-command', emoji: '🏆' },
        { label: 'Hướng dẫn vào kênh voice', value: 'voice-guide', emoji: '🎙️' },
        { label: 'Hướng dẫn Voiceroom', value: 'voiceroom-guide', emoji: '🎵' },
        { label: 'Kênh kiến thức marketing', value: 'marketing-channel', emoji: '📚' },
        { label: 'Kênh tài liệu đen', value: 'black-docs', emoji: '🕵️' },
        { label: 'Achievement ở Marwuy', value: 'achievement', emoji: '⭐' },
        { label: 'Kênh Feedback proposal', value: 'feedback-proposal', emoji: '📝' },
        { label: 'Hướng dẫn Tinder team up', value: 'tinder-teamup', emoji: '💞' },
        { label: 'Hang newbie', value: 'hang-newbie', emoji: '🔋' },
    ]);

module.exports = {
    name: 'guildMemberAdd',
    once: false,

    async execute(guildMember) {
        try {
            if (guildMember.user.bot) return;

            const config = loadOnboardingConfig();
            const welcomeChannelId = config.welcomeChannelId;

            if (!welcomeChannelId || welcomeChannelId === 'YOUR_WELCOME_CHANNEL_ID_HERE') return;

            const channel = guildMember.guild.channels.cache.get(welcomeChannelId)
                || await guildMember.guild.channels.fetch(welcomeChannelId).catch(() => null);

            if (!channel) return;

            const embed = new EmbedBuilder()
                .setTitle('🎉 Chào mừng bạn đến với MarWuy!')
                .setDescription(
                    `Xin chào <@${guildMember.id}>, hãy chọn câu hỏi bên dưới để được hỗ trợ. ` +
                    `Mọi câu hỏi sẽ được trả lời riêng tư.\n\nMarWuy - Better everyday`
                )
                .setColor(0x00BFFF)
                .setFooter({ text: 'Trung tâm hỗ trợ MarWuy' })
                .setTimestamp();

            const row = new ActionRowBuilder().addComponents(selectMenu);

            await channel.send({
                content: `<@${guildMember.id}>`,
                embeds: [embed],
                components: [row],
            });
        } catch (error) {
            console.error('[ERROR] Error in send-onboarding-menu.js:', error);
        }
    },
};
