const path = require('path');
const fs = require('fs');
const { REST, Routes } = require('discord.js');
const dotenv = require('dotenv');

// 1. Load file .env
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
    const envConfig = dotenv.parse(fs.readFileSync(envPath));
    for (const key in envConfig) {
        process.env[key] = envConfig[key];
    }
}

console.log("🚀 --- ĐANG TRIỂN KHAI LỆNH GLOBAL ---");

// 2. Lấy Token và Client ID
const { DISCORD_TOKEN, DISCORD_CLIENT_ID } = process.env;

if (!DISCORD_TOKEN || !DISCORD_CLIENT_ID) {
    console.error("❌ Lỗi: Thiếu DISCORD_TOKEN hoặc DISCORD_CLIENT_ID trong file .env");
    process.exit(1);
}

// 3. Quét thư mục commands
const commands = [];
const commandsPath = path.join(__dirname, 'src', 'commands');

if (fs.existsSync(commandsPath)) {
    const commandFolders = fs.readdirSync(commandsPath);

    for (const folder of commandFolders) {
        const folderPath = path.join(commandsPath, folder);
        if (fs.lstatSync(folderPath).isDirectory()) {
            const commandFiles = fs.readdirSync(folderPath).filter(file => file.endsWith('.js'));

            for (const file of commandFiles) {
                const filePath = path.join(folderPath, file);
                const command = require(filePath);
                if ('data' in command && 'execute' in command) {
                    commands.push(command.data.toJSON());
                }
            }
        }
    }
}

console.log(`📦 Đã tìm thấy ${commands.length} lệnh.`);

// 4. Đẩy lệnh lên Discord API (Chế độ Global)
const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);

(async () => {
    try {
        console.log("⏳ Đang gửi lệnh lên Discord... (Vui lòng đợi)");

        // Sử dụng Routes.applicationCommands (không có Guild ID) để dùng cho mọi server
        await rest.put(
            Routes.applicationCommands(DISCORD_CLIENT_ID),
            { body: commands }
        );

        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("✅ THÀNH CÔNG: Lệnh đã được đăng ký GLOBAL!");
        console.log("💡 Lưu ý quan trọng:");
        console.log("1. Server mới có thể mất 15-60 phút để cập nhật lệnh.");
        console.log("2. Nếu chưa thấy, hãy thử Restart Discord (Ctrl + R).");
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    } catch (error) {
        console.error("❌ Lỗi khi Deploy:");
        console.error(error);
    }
})();