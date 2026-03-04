const fs = require('fs');
const path = require('path');

function loadEvents(client) {
    const eventsPath = path.join(__dirname, '..', 'events');
    const folders = fs.readdirSync(eventsPath);

    for (const folder of folders) {
        const folderPath = path.join(eventsPath, folder);
        const files = fs.readdirSync(folderPath).filter(f => f.endsWith('.js'));

        for (const file of files) {
            const filePath = path.join(folderPath, file);
            const event = require(filePath);

            if (!event.name || !event.execute) {
                console.warn(`[WARNING] Event file ${filePath} is missing "name" or "execute"`);
                continue;
            }

            if (event.once) {
                client.once(event.name, (...args) => event.execute(...args, client));
            } else {
                client.on(event.name, (...args) => event.execute(...args, client));
            }

            console.log(`Loaded event: ${event.name}`);
        }
    }
}

module.exports = { loadEvents };
