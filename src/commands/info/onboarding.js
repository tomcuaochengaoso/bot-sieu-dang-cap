const {
    SlashCommandBuilder,
    StringSelectMenuBuilder,
    ActionRowBuilder,
    EmbedBuilder,
} = require('discord.js');

const data = new SlashCommandBuilder()
    .setName('onboarding')
    .setDescription('Hiển thị menu hướng dẫn onboarding MarWuy');

function buildOnboardingContent() {
    return {
        'server-purpose': `Chuyện kể là ngày xưa, khi đó founder Tú Marwuy đi tìm vùng đất hứa để nghiên cứu tài liệu đen, thì từ Sao Hỏa 1 phi thuyền lao xuống và bước ra 1 người ngoài hành tinh, tuy hơi quái gở, với chiếc mặt xanh và cái tên nghe hơi bóng - bóng xà phòng. Họ gặp nhau và tâm đầu ý hợp, tạo nên sân chơi học thuật và nghiên cứu Marwuy, giúp các Marketer trẻ (trâu - trâu bò với cái ngành củ chuối này) tiếp thu kiến thức, mở rộng networking (hoặc tám chuyện, nấu xôi tùm lum).`,

        'onboard-journey': `**5 BƯỚC ONBOARDING server MarWuy:**\n\n1️⃣ {{huong-dan-kenh}} :  Biết mình nên bắt đầu từ đâu Follow các kênh social để không bỏ lỡ event, tài nguyên xịn\n2️⃣ {{luat-le-marwuy}} để:  Chơi vui nhưng phải đúng luật nheee Nắm rõ quy định để tránh bị "bay màu" oan uổng\n3️⃣ {{kien-thuc-marketing}}, bạn sẽ được tiếp cận: Kho tài liệu dành riêng cho dân hệ Marketing Từ newbie đến intern đều có thể “hấp thụ” kiến thức mỗi ngày\n4️⃣ {{cap-bac-level}}. Tại đây bạn sẽ: Hiểu cách tính XP, Rank, Danh hiệu Biết cách mở khóa đặc quyền theo từng cấp\n5️⃣ Đường tắt đến thăng cấp Nhanh tay vào {{thang-cap}} để biết: Làm gì để lên rank nhanh? Nhiệm vụ nào nên ưu tiên?\n👉 Chỉ mất vài phút onboarding nhưng đổi lại là cả một hệ thống tính năng, đặc quyền và cơ hội kết nối đang chờ bạn phía trước đó!`,

        'rank-command': `Ở Marwuy, quyền lợi của member sẽ phụ thuộc vào rank của account của mọi người. Để biết mỗi cấp bậc tương ứng với gói quyền lợi nào, truy cập {{cap-bac-level}}\n\nLàm sao lên rank: Unlock quyền lợi Senior In Tơn và các cấp bậc khác tại {{cap-bac-level}}. Tại đây bạn sẽ:\n• Hiểu cách tính XP, Rank, Danh hiệu\n• Biết cách mở khóa đặc quyền theo từng cấp`,

        'voice-guide': `Hello newbie wuỷ con, để vào kênh voice các bạn hãy kéo xuống tham gia những phòng chat mà mọi người không để private, cứ tự nhiên nhoaa mn luôn sẵn sàng chào đón bạn nè <3\n\nCòn nếu bạn muốn sở hữu riêng 1 phòng của mình, hãy nhấn vào đây {{tao-kenh-chat}} hoặc kéo xuống, nhấn vào {{bam-de-tao-room}}.`,

        'voiceroom-guide': `Để giúp trải nghiệm Voiceroom của bạn trọn vẹn hơn, hãy thử các lệnh sau:\n\n• **/gobi**: Những lúc ngồi trong room voice mà "đứng hình" không biết làm gì? Gọi ngay Gobi để được hỗ trợ tận tình nhé! Gõ \/gobi vào chat trong Voiceroom nhé.\n\n• **m!play (+link)**: Thêm bài hát từ Youtube, Spotify... để cùng nghe với các "cạ cứng".\n• **m!next**: Chuyển sang bài hát tiếp theo trong một nốt nhạc.\n• **m!clear**: Dọn dẹp sạch sẽ danh sách nhạc hiện tại.\n\nVí dụ: \`m!play https://youtu.be/t1qyeZzZft0\``,

        'marketing-channel': `Khu vực này là “mỏ vàng” của Marwuy nè, dịch chuyển tới {{kien-thuc-marketing}} để đắm mình trong tài liệu, kiến thức và kinh nghiệm thực tiễn của member Marwuy.\n\nTừ Marketing Fundamental, Case Study, Branding, Digital Marketing, Trade Marketing, Công nghệ trong Marketing, Tâm thế khi đi thi giải Case- đủ các nhóm chủ đề để bạn tha hồ học hỏi.\n\nChỉ cần làm theo hướng dẫn trong kênh để mở ra các kênh chủ đề liên quan mà bạn quan tâm.`,

        'black-docs': `Đây mới là nơi tuyệt mật tối cao của Marwuy nè. Nếu {{kien-thuc-marketing}} tập hợp 101 tài liệu, kiến thức Marketing thì tại {{tai-lieu-den}} bạn có thể truy cập được nhiều hơn thế nữa.\n\nTừ tài liệu học tập, đến số liệu các ngành hàng, số liệu thứ cấp, đến sách và các tài liệu khóa học có phí (nhưng đã hóa miễn phí tại đây=)), recap các workshop, cuộc thi, record break đề, feedback proposal của server,... !\n\n⚠️ Lưu ý: Để truy cập {{tai-lieu-den}}, bạn cần cày rank thành “Bảo kê”, để biết mình đang ở rank nào hãy gõ lệnh \/rank.\n\nMuốn cày rank nhanh nhưng chưa biết cách? Truy cập {{thang-cap}} và tham gia tính năng Achievement để leo rank vùng vụt, nhận quyền lợi ào ào nhoo<3`,

        'achievement': `🎯 **ACHIEVEMENT LÀ GÌ!?**\n\nLà hệ thống nhiệm vụ, tính năng Achievement = Danh hiệu + XP. Cứ chăm chỉ hoàn thành nhiệm vụ là XP sẽ đổ về túi, giúp bạn thăng hạng vèo vèo và mở khóa hàng loạt đặc quyền xịn xò đó!!!\n\nCàng nhiều XP, rank leo càng nhanh, đặc quyền càng “vuýp”. Đích đến cuối cùng của hành trình này chính là ngôi vị **Giáo chủ** – cấp bậc duy nhất giúp bạn nắm trọn toàn bộ đặc quyền trên server của 𝐌𝐚𝐫𝐖𝐮𝐲 nè.\n\n⚡ **CÓ NHỮNG LOẠI ACHIEVEMENT NÀO NHỈ?**\n\n1. **Achievement sự kiện**\n• Chỉ đổ bộ vào các dịp đặc biệt (lễ, event bí mật, hoạt động cộng đồng...)\n• Vì là hàng "limited" nên chỉ xuất hiện trong một khoảng thời gian GIỚI HẠN thui, nhưng bù lại thì lượng XP nhận được lại “KHỦNG” hơn hẳn nhiệm vụ thường luôn đó\n• Cập nhật nhiệm vụ tại: {{loa-phuong}}\n👉 Nhớ là phải nhanh tay hoàn thành kẻo em nó "bay màu" mất là tiếc hùi hụi luôn đóoo\n\n2. **One-time Achievement**\n• Những nhiệm vụ dành riêng cho các "thợ săn" danh hiệu với lộ trình cực rõ ràng: chỉ cần thực hiện đúng hoạt động theo checklist ➔ rinh ngay Danh hiệu ➔ nhận lượng XP tương ứng về túi là xong nè, quá ez phải khum!!??\n• Cập nhật nhiệm vụ tại: {{thang-cap}}\n👉 Bật mí nhỏ nè: Nhiệm vụ càng "khoai", XP càng nhiều, giúp bạn leo rank nhanh như chớp và khẳng định đẳng cấp trong server như anh Bình Gold lun!`,

        'feedback-proposal': `Alo Newbie Wuỷ con à? Wuỷ con thi thố xong proposal để đó không cải thiện à, mau mau vào kênh này {{feedback-proposal}} để nhận feedback từ các Giáo chủ giúp hoàn thiện proposal của mình bỏ vào Portfolio nhé hẹ hẹ`,

        'tinder-teamup': `Trên đoạn đường nào cũng có những người đi một mình, nhưng đi thi case mà đi một mình là phần lớn cuộc thi hong có cho bạn thi. Vậy nên bạn chỉ cần vào đây {{tinder-team-up}} để tìm người đồng hành cùng mình nà.\n\n**Cách để tiền hành matching nè:**\n• B1: Gõ \`wimate\` copy id của bạn\n• B2: Vào link lark điền các thông tin và ước nguyện bạn\n• B3: Nhớ nhấn nộp nhe\n• B4: Chờ đợi là hạnh phúc, khoảng thời gian chờ của bạn sẽ khoảng nửa ngày tới 2 ngày nè nhớ để ý thông báo ở kênh chat chung nhé.`,

        'hang-newbie': `**{{hang-cua-newbie}}** – "Trạm sạc" XP thần thánh.\n\n😋 **TRICK LEO RANK NHANH**\nChỉ cần tham gia room và ngồi chill cùng đồng đội trong Hang hơn 15 phút, bạn sẽ được tự động cộng ngay 15XP vào tài khoản!\n\n🗓️ **WORKSPACE TRÁ HÌNH**\nRất phù hợp cho những buổi họp hành hay thảo luận bài tập cần sự tập trung cao độ.\n\n🎖 **CÙNG LOẠT QUYỀN LỢI SIÊU HẤP DẪN**\n👉 Badge khen thưởng - Những huy hiệu độc quyền giúp bạn tăng XP siêu nhanh.\n👉 Sự trợ giúp từ "trợ thủ họ Có" - Nếu còn bối rối về cách dùng lệnh hay kiến thức Marketing, đừng quên gọi em bot để được giải đáp tức thì nhé!`,
    };
}

function buildSelectMenu() {
    return new StringSelectMenuBuilder()
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
}

function buildMenuPayload() {
    const embed = new EmbedBuilder()
        .setTitle('🎉 Chào mừng bạn đến với MarWuy!')
        .setDescription('Hãy chọn câu hỏi bên dưới để được hỗ trợ. Mọi câu hỏi sẽ được trả lời riêng tư.\n\nMarWuy - Better everyday')
        .setColor(0x00BFFF)
        .setFooter({ text: 'Trung tâm hỗ trợ MarWuy' })
        .setTimestamp();

    const row = new ActionRowBuilder().addComponents(buildSelectMenu());

    return { embeds: [embed], components: [row] };
}

module.exports = {
    data,
    async execute(interaction) {
        const payload = buildMenuPayload();
        await interaction.reply(payload);
    },
};

module.exports.buildOnboardingContent = buildOnboardingContent;
module.exports.buildMenuPayload = buildMenuPayload;
