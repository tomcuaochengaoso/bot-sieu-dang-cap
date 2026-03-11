// Watchdog Entry Point
// Independent process that monitors bot health and sends alerts

require('dotenv/config');
const AlertManager = require('./modules/alertManager');

const manager = new AlertManager({
  stateDir: process.env.STATE_DIR || './state',
  emailUser: process.env.ALERT_EMAIL_USER,
  emailPass: process.env.ALERT_EMAIL_PASS,
  emailTo: process.env.ALERT_EMAIL_TO,
  checkIntervalMs: 30000,
  heartbeatTimeoutMs: 120000,
});

process.on('SIGINT', () => {
  manager.stop();
  process.exit(0);
});
process.on('SIGTERM', () => {
  manager.stop();
  process.exit(0);
});

manager.start().catch(err => {
  console.error('[Watchdog] Fatal error:', err);
  process.exit(1);
});
