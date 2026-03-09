// Analytics Pipeline Setup
// Initializes the analytics event streaming pipeline and attaches to the shared Discord client
// (Adapted from ivan-bot's Application class)

const path = require('path');
const { createProductionClient } = require('./modules/httpClient');
const { EventProcessor } = require('./modules/eventProcessor');
const {
  AdaptiveScalingManager,
  EventQueue,
  BatchCoordinator,
  InfrastructureMonitor,
  ProcessingCoordinator,
} = require('./modules/queueHandler');
const AnalyticsEventListener = require('./modules/discordClient');
const StateFileWriter = require('./utils/stateFileWriter');

class AnalyticsSystem {
  constructor(discordClient) {
    this.running = false;
    this.batchLoopTask = null;
    this.startTime = Date.now();
    this.discordClient = discordClient;

    // Check if analytics is configured
    const hasConfig = process.env.ANALYTICS_API_TOKEN && process.env.ANALYTICS_API_ENDPOINT;
    if (!hasConfig) {
      console.log('[Analytics] ANALYTICS_API_TOKEN or ANALYTICS_API_ENDPOINT not set - analytics disabled');
      this.enabled = false;
      return;
    }
    this.enabled = true;

    const stateDir = process.env.STATE_DIR || './state';

    // --- Component creation (bottom-up order) ---

    // 1. State file writer
    this.stateWriter = new StateFileWriter(stateDir);

    // 2. Event processor
    const configPath = path.join(__dirname, 'config', 'eventSchemas.yml');
    this.eventProcessor = new EventProcessor(configPath);

    // 3. HTTP client
    this.apiClient = createProductionClient(
      process.env.ANALYTICS_API_TOKEN,
      process.env.ANALYTICS_API_ENDPOINT,
    );

    // 4. Scaling manager
    this.scalingManager = new AdaptiveScalingManager();

    // 5. Event queue
    this.eventQueue = new EventQueue(this.scalingManager.currentTier.queueCapacity, {
      threshold: this.scalingManager.currentTier.threshold,
    });

    // 6. Batch coordinator
    this.batchCoordinator = new BatchCoordinator(this.apiClient, {
      batchSize: this.scalingManager.currentTier.batchSize,
      intervalMs: this.scalingManager.currentTier.interval,
    });

    // 7. Infrastructure monitor
    this.monitor = new InfrastructureMonitor(this.stateWriter, this.scalingManager);

    // 8. Processing coordinator
    this.processingCoordinator = new ProcessingCoordinator(this.eventProcessor, this.eventQueue);

    // 9. Attach analytics event listeners to the shared Discord client
    this.analyticsListener = new AnalyticsEventListener(discordClient, this.processingCoordinator);

    // --- Wire callbacks ---
    this._wireCallbacks();

    // Remove old shutdown flag
    this.stateWriter.removeFlag('clean_shutdown.flag');
  }

  _wireCallbacks() {
    // Queue overflow -> monitor alert
    this.eventQueue.queue.overflowHandler = (_item, stats) => {
      console.warn(`[Analytics] Queue overflow! Size: ${stats.currentSize}/${stats.maxSize}`);
      this.monitor.writeAlertTrigger('queue_overflow', stats);
    };

    // Queue threshold -> scaling check
    this.eventQueue.thresholdCallback = (queueSize, utilization) => {
      this.scalingManager.checkScaling(queueSize, utilization);
    };

    // Scaling event -> update components
    this.scalingManager.onScaleCallback = (newTier, event) => {
      this.eventQueue.updateMaxSize(newTier.queueCapacity);
      this.batchCoordinator.updateConfig({
        batchSize: newTier.batchSize,
        intervalMs: newTier.interval,
        tier: newTier.level,
      });
      this.monitor.writeScalingState();
    };

    // Batch transmission -> monitor
    this.batchCoordinator.onSuccess = (result) => {
      this.monitor.recordApiSuccess();
    };

    this.batchCoordinator.onFailure = (result) => {
      this.monitor.recordApiFailure();
      if (this.monitor.metrics.consecutiveApiFailures >= 5) {
        this.monitor.writeAlertTrigger('api_failure', {
          consecutiveFailures: this.monitor.metrics.consecutiveApiFailures,
        });
        this.scalingManager.scaleDownOnErrors(this.eventQueue.size, this.eventQueue.getUtilization());
      }
    };
  }

  // --- Batch processing loop ---
  async _batchLoop() {
    let iterationCount = 0;

    while (this.running) {
      try {
        const queueStats = this.eventQueue.getStats();
        const batchStats = this.batchCoordinator.getStats();

        // 1. Heartbeat
        this.monitor.writeHeartbeat(queueStats, batchStats);

        // 2. Tier time tracking
        this.scalingManager.updateTierTime();

        // 3. Periodic daily stats + anomaly check
        if (iterationCount % 30 === 0) {
          this.monitor.writeDailyStats(queueStats, batchStats);
          this.monitor.checkAnomalies();
        }

        // 4. Scaling check (for timer-based scale-down)
        const utilization = this.eventQueue.getUtilization();
        this.scalingManager.checkScaling(this.eventQueue.size, utilization);

        // 5. Batch collection and sending
        if (this.batchCoordinator.shouldSend(this.eventQueue.size)) {
          const events = this.eventQueue.getBatch(this.batchCoordinator.batchSize);
          if (events.length) {
            for (const event of events) {
              const category = event.properties?.luong || 'Unknown';
              this.monitor.recordEvent(category);
            }

            const result = await this.batchCoordinator.sendBatch(events);
            if (result && !result.success && events.length) {
              this.eventQueue.returnItems(events);
            }
          }
        }

        // 6. Status display (every 60 iterations)
        if (iterationCount % 60 === 0) {
          this._displayStatus();
        }

        iterationCount++;
      } catch (err) {
        console.error('[Analytics] Batch loop error:', err.message);
      }

      const interval = this.scalingManager.currentTier.interval;
      await new Promise(r => setTimeout(r, interval));
    }
  }

  _displayStatus() {
    const tier = this.scalingManager.currentTierIndex;
    const qs = this.eventQueue.getStats();
    const bs = this.batchCoordinator.getStats();
    const uptime = Math.round((Date.now() - this.startTime) / 1000);
    const uptimeStr = `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m`;

    console.log([
      `\n--- Analytics Status ---`,
      `Tier: ${tier} | Queue: ${qs.currentSize}/${qs.maxSize} (${(qs.utilization * 100).toFixed(1)}%)`,
      `Batch: size=${this.scalingManager.currentTier.batchSize} interval=${this.scalingManager.currentTier.interval}ms`,
      `Events: ${this.monitor.metrics.totalEventsProcessed} | Batches: ${bs.batchesSent} (${(bs.successRate * 100).toFixed(1)}% ok)`,
      `Pending timeouts: ${this.eventProcessor.getPendingCount()} | Uptime: ${uptimeStr}`,
      `API failures: ${this.monitor.metrics.consecutiveApiFailures}`,
      `------------------------\n`,
    ].join('\n'));
  }

  // --- Lifecycle ---
  start() {
    if (!this.enabled) return;

    console.log('[Analytics] Starting analytics pipeline...');
    this.running = true;
    this.batchLoopTask = this._batchLoop();
    console.log('[Analytics] Pipeline started');
  }

  async stop() {
    if (!this.enabled) return;

    this.running = false;

    // Write clean shutdown flag
    this.stateWriter.writeFlag('clean_shutdown.flag');

    // Cleanup event processor (cancel pending timeouts)
    this.eventProcessor.cleanup();

    // Write shutdown summary
    const queueStats = this.eventQueue.getStats();
    const batchStats = this.batchCoordinator.getStats();
    this.monitor.writeShutdownSummary(queueStats, batchStats);

    // Flush remaining events
    const remaining = this.eventQueue.clear();
    if (remaining.length) {
      console.log(`[Analytics] Flushing ${remaining.length} remaining events...`);
      try {
        await this.batchCoordinator.sendBatch(remaining);
      } catch (err) {
        console.error('[Analytics] Failed to flush remaining events:', err.message);
      }
    }

    this._displayStatus();
    console.log('[Analytics] Pipeline stopped');
  }
}

module.exports = AnalyticsSystem;
