// Analytics Debug Logger
// Enable with ANALYTICS_DEBUG=true in .env

const enabled = process.env.ANALYTICS_DEBUG === 'true';

const COLORS = {
  event:   '\x1b[36m',  // cyan
  process: '\x1b[33m',  // yellow
  queue:   '\x1b[35m',  // magenta
  api:     '\x1b[32m',  // green
  scale:   '\x1b[34m',  // blue
  life:    '\x1b[37m',  // white
  reset:   '\x1b[0m',
};

function debug(tag, ...args) {
  if (!enabled) return;
  const color = COLORS[tag] || COLORS.reset;
  const prefix = `${color}[DEBUG:${tag.toUpperCase()}]${COLORS.reset}`;
  console.log(prefix, ...args);
}

debug.enabled = enabled;

module.exports = debug;
