// Alert Manager / Watchdog Module (Guide #6)
// Independent health monitoring and email alerting

const nodemailer = require('nodemailer');
const StateFileWriter = require('../utils/stateFileWriter');

// --- Rate Limiter ---

class AlertRateLimiter {
  constructor(cooldowns = {}) {
    this.cooldowns = {
      bot_crash: 300000,       // 5 min
      queue_overflow: 600000,  // 10 min
      api_failure: 900000,     // 15 min
      scaling_anomaly: 1800000, // 30 min
      ...cooldowns,
    };
    this.lastAlertTimes = {};
    this.alertCounts = {};
  }

  canSend(alertType) {
    const last = this.lastAlertTimes[alertType] || 0;
    const cooldown = this.cooldowns[alertType] || 600000;
    return Date.now() - last >= cooldown;
  }

  record(alertType) {
    this.lastAlertTimes[alertType] = Date.now();
    this.alertCounts[alertType] = (this.alertCounts[alertType] || 0) + 1;
  }
}

// --- Email Sender ---

class EmailSender {
  constructor({ user, pass, to }) {
    this.to = to;
    this.transporter = null;
    if (user && pass) {
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user, pass },
      });
      this.from = user;
    }
  }

  async sendAlert(subject, htmlBody, priority = 'normal') {
    if (!this.transporter) {
      console.log(`[AlertManager] Email not configured. Alert: ${subject}`);
      return false;
    }

    const mailOptions = {
      from: this.from,
      to: this.to,
      subject,
      html: htmlBody,
      priority,
    };

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        await this.transporter.sendMail(mailOptions);
        console.log(`[AlertManager] Alert sent: ${subject}`);
        return true;
      } catch (err) {
        console.error(`[AlertManager] Email attempt ${attempt + 1} failed:`, err.message);
        if (attempt < 2) await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
      }
    }
    return false;
  }
}

// --- HTML Email Templates ---

function buildAlertHtml(title, sections) {
  const sectionHtml = sections.map(s => {
    const colorMap = { critical: '#dc3545', warning: '#ffc107', success: '#28a745', info: '#17a2b8' };
    const color = colorMap[s.type] || colorMap.info;
    return `
      <div style="border-left:4px solid ${color};padding:12px 16px;margin:12px 0;background:#f8f9fa;">
        <h3 style="margin:0 0 8px;color:${color}">${s.title}</h3>
        <div style="font-family:monospace;font-size:13px;white-space:pre-wrap;">${s.content}</div>
      </div>`;
  }).join('');

  return `
    <div style="max-width:600px;margin:0 auto;font-family:Arial,sans-serif;">
      <h2 style="color:#333;border-bottom:2px solid #333;padding-bottom:8px;">${title}</h2>
      ${sectionHtml}
      <div style="color:#999;font-size:11px;margin-top:20px;">ivan-bot watchdog | ${new Date().toISOString()}</div>
    </div>`;
}

// --- Health Monitor ---

class HealthMonitor {
  constructor(stateDir, heartbeatTimeoutMs = 120000) {
    this.stateReader = new StateFileWriter(stateDir);
    this.heartbeatTimeoutMs = heartbeatTimeoutMs;
  }

  check() {
    const heartbeat = this.stateReader.readJson('heartbeat.json');
    if (!heartbeat) return { status: 'unknown' };

    const age = Date.now() - new Date(heartbeat.timestamp).getTime();
    if (age > this.heartbeatTimeoutMs) {
      return { status: 'crashed', lastHeartbeat: heartbeat, age };
    }
    return { status: 'healthy', lastHeartbeat: heartbeat, age };
  }

  isCleanShutdown() {
    return this.stateReader.flagExists('clean_shutdown.flag');
  }

  clearShutdownFlag() {
    this.stateReader.removeFlag('clean_shutdown.flag');
  }
}

// --- Scaling Anomaly Detector ---

class ScalingAnomalyDetector {
  constructor(stateDir) {
    this.stateReader = new StateFileWriter(stateDir);
  }

  analyze() {
    const state = this.stateReader.readJson('scaling_state.json');
    if (!state) return [];

    const anomalies = [];

    // Stuck at high tier
    if (state.currentTier >= 3) {
      const tierTime = state.tierTime?.[state.currentTier] || 0;
      if (tierTime > 3600000) {
        anomalies.push({ type: 'stuck_high_tier', tier: state.currentTier, duration: tierTime, severity: 'warning' });
      }
    }

    // Excessive oscillation
    const recent = (state.recentHistory || []).filter(e =>
      Date.now() - new Date(e.timestamp).getTime() < 600000
    );
    if (recent.length > 10) {
      anomalies.push({ type: 'excessive_oscillation', count: recent.length, severity: 'warning' });
    }

    return anomalies;
  }
}

// --- Main Alert Manager ---

class AlertManager {
  constructor({
    stateDir = './state',
    emailUser,
    emailPass,
    emailTo,
    checkIntervalMs = 30000,
    heartbeatTimeoutMs = 120000,
    cooldowns = {},
  } = {}) {
    this.stateDir = stateDir;
    this.checkIntervalMs = checkIntervalMs;

    this.email = new EmailSender({ user: emailUser, pass: emailPass, to: emailTo });
    this.rateLimiter = new AlertRateLimiter(cooldowns);
    this.healthMonitor = new HealthMonitor(stateDir, heartbeatTimeoutMs);
    this.anomalyDetector = new ScalingAnomalyDetector(stateDir);
    this.stateReader = new StateFileWriter(stateDir);

    this.running = false;
    this.lastDailySummaryDate = null;
    this.dailySummaryHour = 9;
  }

  async start() {
    this.running = true;
    console.log('[Watchdog] Started monitoring');

    while (this.running) {
      try {
        await this._checkBotHealth();
        await this._checkAlertTriggers();
        await this._checkScalingAnomalies();
        await this._checkDailySummary();
      } catch (err) {
        console.error('[Watchdog] Check error:', err.message);
      }
      await new Promise(r => setTimeout(r, this.checkIntervalMs));
    }
  }

  stop() {
    this.running = false;
    console.log('[Watchdog] Stopped monitoring');
  }

  async _checkBotHealth() {
    const health = this.healthMonitor.check();

    if (health.status === 'crashed') {
      if (this.healthMonitor.isCleanShutdown()) {
        this.healthMonitor.clearShutdownFlag();
        console.log('[Watchdog] Clean shutdown detected, skipping alert');
        return;
      }

      if (this.rateLimiter.canSend('bot_crash')) {
        this.rateLimiter.record('bot_crash');
        const hb = health.lastHeartbeat;
        await this.email.sendAlert(
          '[CRITICAL] ivan-bot Crashed',
          buildAlertHtml('Bot Crash Detected', [
            { type: 'critical', title: 'Bot Process Crashed', content: `Last heartbeat: ${hb.timestamp}\nAge: ${Math.round(health.age / 1000)}s\nEvents processed: ${hb.eventsProcessed}\nQueue size: ${hb.queueSize}/${hb.queueMax}\nTier: ${hb.currentTier}\nAPI failures: ${hb.consecutiveApiFailures}` },
            { type: 'info', title: 'Recommended Actions', content: '1. Check system logs\n2. Restart the bot process\n3. Monitor for recurring crashes' },
          ]),
          'high',
        );
      }
    }
  }

  async _checkAlertTriggers() {
    const triggers = this.stateReader.readJson('alert_triggers.json');
    if (!triggers) return;

    if (triggers.queue_overflow?.triggered) {
      if (this.rateLimiter.canSend('queue_overflow')) {
        this.rateLimiter.record('queue_overflow');
        const data = triggers.queue_overflow;
        await this.email.sendAlert(
          '[WARNING] Queue Overflow - Events Lost',
          buildAlertHtml('Queue Overflow Alert', [
            { type: 'warning', title: 'Events Lost', content: `Timestamp: ${data.timestamp}\nRejected: ${data.rejected || 'unknown'}\nQueue size: ${data.currentSize || 'unknown'}/${data.maxSize || 'unknown'}` },
          ]),
          'high',
        );
      }
      this.stateReader.mergeJson('alert_triggers.json', { queue_overflow: { triggered: false } });
    }

    if (triggers.api_failure?.triggered) {
      if (this.rateLimiter.canSend('api_failure')) {
        this.rateLimiter.record('api_failure');
        const data = triggers.api_failure;
        await this.email.sendAlert(
          '[WARNING] API Failure Detected',
          buildAlertHtml('API Failure Alert', [
            { type: 'critical', title: 'Consecutive API Failures', content: `Failures: ${data.consecutiveFailures || 'unknown'}\nTimestamp: ${data.timestamp}` },
            { type: 'info', title: 'Recommended Actions', content: '1. Check analytics API status\n2. Verify API credentials\n3. Check network connectivity' },
          ]),
          'high',
        );
      }
      this.stateReader.mergeJson('alert_triggers.json', { api_failure: { triggered: false } });
    }
  }

  async _checkScalingAnomalies() {
    const anomalies = this.anomalyDetector.analyze();
    if (!anomalies.length) return;

    if (this.rateLimiter.canSend('scaling_anomaly')) {
      this.rateLimiter.record('scaling_anomaly');
      const content = anomalies.map(a => `Type: ${a.type}\nSeverity: ${a.severity}\nDetails: ${JSON.stringify(a, null, 2)}`).join('\n---\n');
      await this.email.sendAlert(
        '[WARNING] Scaling Anomaly Detected',
        buildAlertHtml('Scaling Anomaly', [
          { type: 'warning', title: 'Anomalies Detected', content },
        ]),
        'normal',
      );
    }
  }

  async _checkDailySummary() {
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    if (now.getHours() !== this.dailySummaryHour || this.lastDailySummaryDate === today) return;

    this.lastDailySummaryDate = today;
    const stats = this.stateReader.readJson('daily_stats.json');
    if (!stats) return;

    const uptime = stats.uptime ? `${Math.round(stats.uptime / 3600)}h ${Math.round((stats.uptime % 3600) / 60)}m` : 'N/A';
    const categories = Object.entries(stats.categoryBreakdown || {})
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([k, v]) => `  ${k}: ${v}`)
      .join('\n');

    await this.email.sendAlert(
      `[Daily Report] ivan-bot Health Summary - ${today}`,
      buildAlertHtml('Daily Health Report', [
        { type: 'success', title: 'Overview', content: `Events processed: ${stats.totalEventsProcessed || 0}\nUptime: ${uptime}\nAPI success rate: ${((stats.apiSuccessRate || 0) * 100).toFixed(1)}%` },
        { type: 'info', title: 'Top Event Categories', content: categories || 'No events' },
        { type: 'info', title: 'Scaling', content: `Current tier: ${stats.scalingState?.currentTier ?? 'N/A'}\nScale-ups: ${stats.scalingState?.scaleUpCount ?? 0}\nScale-downs: ${stats.scalingState?.scaleDownCount ?? 0}` },
      ]),
      'normal',
    );
  }
}

module.exports = AlertManager;
