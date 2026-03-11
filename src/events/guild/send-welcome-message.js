const WelcomeChannel = require('../../models/WelcomeChannel');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'guildMemberAdd',
    once: false,

    /**
     * @param {import('discord.js').GuildMember} guildMember
     */
    async execute(guildMember) {
        try {
            if (guildMember.user.bot) return;

            const welcomeConfigs = await WelcomeChannel.find({
                guildId: guildMember.guild.id
            }); 

            for (const welcomeConfig of welcomeConfigs) {
                const targetChannel =
                    guildMember.guild.channels.cache.get(welcomeConfig.channelId) ||
                    (await guildMember.guild.channels.fetch(welcomeConfig.channelId).catch(() => null));

                if (!targetChannel) {
                    await WelcomeChannel.findOneAndDelete({
                        guildId: guildMember.guild.id,
                        channelId: welcomeConfig.channelId,
                    }).catch(() => {});
                    continue;
                }

                const buttons = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId(`feedback_${welcomeConfig.guildId}`)
                        .setLabel("Feedback")
                        .setStyle(ButtonStyle.Secondary)
                );

                const customMessage = welcomeConfig.customMessage;

                const welcomeMessage = customMessage
                    .replace('{mention-member}', `<@${guildMember.id}>`)
                    .replace('{username}', guildMember.user.username)
                    .replace('{server-name}', guildMember.guild.name);

                // Create embed
                const welcomeEmbed = new EmbedBuilder()
                    .setColor('#0099ff')
                    .setTitle(`Welcome to ${guildMember.guild.name}!`)
                    .setDescription(welcomeMessage)
                    .setThumbnail(guildMember.user.displayAvatarURL({ dynamic: true }))
                    .setImage(guildMember.guild.iconURL({ dynamic: true, size: 512 })) // Server icon
                    .addFields(
                        { name: 'Member Count', value: `You're member #${guildMember.guild.memberCount}!`, inline: true },
                        { name: 'Account Created', value: `<t:${Math.floor(guildMember.user.createdTimestamp / 1000)}:R>`, inline: true }
                    )
                    .setFooter({ text: `ID: ${guildMember.id}` })
                    .setTimestamp();

                targetChannel.send({
                    content: welcomeMessage,
                    embeds: [welcomeEmbed],
                    components: [buttons]
                }).catch(() => {});
            }
        } catch (error) {
            console.log(`Error in send-welcome-message.js:`, error);
        }
    },
};