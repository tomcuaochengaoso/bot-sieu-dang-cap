const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

let cachedConfig = null;

function loadOnboardingConfig() {
    if (cachedConfig) return cachedConfig;

    const configPath = path.join(__dirname, '..', 'config', 'onboarding.yaml');
    const fileContents = fs.readFileSync(configPath, 'utf8');
    const raw = yaml.load(fileContents);

    if (!raw.channelIds) {
        raw.channelIds = {
            ...(raw.existingChannels || {}),
            ...(raw.futureChannels || {}),
        };
    }

    cachedConfig = raw;
    return cachedConfig;
}

function resolveChannelMentions(content, channelIds) {
    let resolved = content;
    for (const [key, id] of Object.entries(channelIds)) {
        resolved = resolved.split(`{{${key}}}`).join(`<#${id}>`);
    }
    return resolved;
}

module.exports = {
    loadOnboardingConfig,
    resolveChannelMentions,
};
