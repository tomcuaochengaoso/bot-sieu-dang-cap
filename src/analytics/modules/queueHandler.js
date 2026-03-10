// Queue and Infrastructure Management Module (Guide #4)
// Event buffering, adaptive scaling, batch coordination, and system monitoring

const { isBatchSafe, estimateBatchSize, splitBatch } = require('./httpClient');
const debug = require('../utils/debug');

// --- System 2: Adaptive Scaling Manager ---

class ScalingTier {
  constructor(level, queueCapacity, batchSize, interval, threshold) {
    this.level = level;
    this.queueCapacity = queueCapacity;
    this.batchSize = batchSize;
    this.interval = interval;
    this.threshold = threshold;
  }
}

const DEFAULT_TIERS = [
  new ScalingTier(0, 500,   50,  10000, 0.6),
  new ScalingTier(1, 1000,  100, 10000, 0.6),
  new ScalingTier(2, 2000,  200, 10000, 0.6),
  new ScalingTier(3, 5000,  500, 10000, 0.6),
  new ScalingTier(4, 10000, 1000, 10000, 0.6),
];

class AdaptiveScalingManager {
  constructor(tiers = DEFAULT_TIERS, { scaleDownCooldownMs = 60000, scaleDownThreshold = 0.2 } = {}) {
    this.tiers = tiers;
    this.currentTierIndex = 0;
    this.scaleDownCooldownMs = scaleDownCooldownMs;
    this.scaleDownThreshold = scaleDownThreshold;

    this.enteredTierAt = Date.now();
    this.lastScaleUp = 0;
    this.lastScaleDown = 0;
    this.lastThresholdHit = 0;

    this.history = [];
    this.tierTime = new Map();
    this.scaleUpCount = 0;
    this.scaleDownCount = 0;

    this.onScaleCallback = null;
  }

  get currentTier() {
    return this.tiers[this.currentTierIndex];
  }

  checkScaling(queueSize, utilization) {
    const now = Date.now();

    // Scale up: immediate
    if (utilization >= this.currentTier.threshold && this.currentTierIndex < this.tiers.length - 1) {
      this.lastThresholdHit = now;
      return this._scaleUp(queueSize, utilization, 'threshold');
    }

    // Scale down: delayed
    if (utilization <= this.scaleDownThreshold && this.currentTierIndex > 0) {
      if (now - this.lastScaleDown >= this.scaleDownCooldownMs) {
        return this._scaleDown(queueSize, utilization, 'low_utilization');
      }
    }

    // Timer-based scale down
    if (this.currentTierIndex > 0 && now - this.lastThresholdHit > this.scaleDownCooldownMs * 2) {
      if (now - this.lastScaleDown >= this.scaleDownCooldownMs) {
        return this._scaleDown(queueSize, utilization, 'timer');
      }
    }

    return null;
  }

  scaleDownOnErrors(queueSize, utilization) {
    if (this.currentTierIndex > 0) {
      return this._scaleDown(queueSize, utilization, 'api_errors');
    }
    return null;
  }

  _scaleUp(queueSize, utilization, reason) {
    const fromTier = this.currentTierIndex;
    this._recordTierTime();
    this.currentTierIndex = Math.min(this.currentTierIndex + 1, this.tiers.length - 1);
    this.lastScaleUp = Date.now();
    this.enteredTierAt = Date.now();
    this.scaleUpCount++;

    const event = { timestamp: new Date().toISOString(), from: fromTier, to: this.currentTierIndex, reason, queueSize, utilization };
    this.history.push(event);
    if (this.history.length > 50) this.history.shift();

    console.log(`[Scaling] UP: Tier ${fromTier} -> ${this.currentTierIndex} (${reason})`);
    if (this.onScaleCallback) this.onScaleCallback(this.currentTier, event);
    return event;
  }

  _scaleDown(queueSize, utilization, reason) {
    const fromTier = this.currentTierIndex;
    this._recordTierTime();
    this.currentTierIndex = Math.max(this.currentTierIndex - 1, 0);
    this.lastScaleDown = Date.now();
    this.enteredTierAt = Date.now();
    this.scaleDownCount++;

    const event = { timestamp: new Date().toISOString(), from: fromTier, to: this.currentTierIndex, reason, queueSize, utilization };
    this.history.push(event);
    if (this.history.length > 50) this.history.shift();

    console.log(`[Scaling] DOWN: Tier ${fromTier} -> ${this.currentTierIndex} (${reason})`);
    if (this.onScaleCallback) this.onScaleCallback(this.currentTier, event);
    return event;
  }

  _recordTierTime() {
    const elapsed = Date.now() - this.enteredTierAt;
    const prev = this.tierTime.get(this.currentTierIndex) || 0;
    this.tierTime.set(this.currentTierIndex, prev + elapsed);
  }

  updateTierTime() {
    this._recordTierTime();
    this.enteredTierAt = Date.now();
  }

  detectAnomalies() {
    const anomalies = [];
    const timeInTier = Date.now() - this.enteredTierAt;

    // Stuck at high tier
    if (this.currentTierIndex >= this.tiers.length - 2 && timeInTier > 3600000) {
      anomalies.push({ type: 'stuck_high_tier', tier: this.currentTierIndex, duration: timeInTier, severity: 'warning' });
    }

    // Excessive oscillation
    const recentEvents = this.history.filter(e => Date.now() - new Date(e.timestamp).getTime() < 600000);
    if (recentEvents.length > 10) {
      anomalies.push({ type: 'excessive_oscillation', count: recentEvents.length, severity: 'warning' });
    }

    return anomalies;
  }

  getState() {
    const tierTimeObj = {};
    for (const [k, v] of this.tierTime) tierTimeObj[k] = v;
    return {
      currentTier: this.currentTierIndex,
      config: this.currentTier,
      scaleUpCount: this.scaleUpCount,
      scaleDownCount: this.scaleDownCount,
      recentHistory: this.history.slice(-10),
      tierTime: tierTimeObj,
    };
  }
}

// --- System 3: Generic Memory Queue ---

class MemoryQueue {
  constructor(maxSize = 500, overflowHandler = null) {
    this.items = [];
    this.maxSize = maxSize;
    this.overflowHandler = overflowHandler;
    this.stats = { added: 0, removed: 0, overflows: 0, rejected: 0 };
  }

  add(item) {
    if (this.items.length >= this.maxSize) {
      this.stats.overflows++;
      this.stats.rejected++;
      if (this.overflowHandler) this.overflowHandler(item, this.getStats());
      return false;
    }
    this.items.push(item);
    this.stats.added++;
    return true;
  }

  getBatch(count) {
    const batch = this.items.splice(0, count);
    this.stats.removed += batch.length;
    return batch;
  }

  returnItems(items) {
    this.items.unshift(...items);
  }

  get size() {
    return this.items.length;
  }

  clear() {
    const items = [...this.items];
    this.items = [];
    return items;
  }

  updateMaxSize(newMax) {
    if (newMax < 10) return;
    this.maxSize = newMax;
  }

  getStats() {
    return { ...this.stats, currentSize: this.items.length, maxSize: this.maxSize };
  }
}

// --- System 4: Event Queue ---

class EventQueue {
  constructor(maxSize = 500, { thresholdCallback = null, overflowCallback = null, threshold = 0.6 } = {}) {
    this.queue = new MemoryQueue(maxSize, (item, stats) => {
      if (overflowCallback) overflowCallback(stats);
    });
    this.thresholdCallback = thresholdCallback;
    this.threshold = threshold;
    this.totalOverflows = 0;
  }

  add(event) {
    if (!event || !event.event || !event.properties) {
      debug('queue', `Rejected invalid event (missing event/properties)`);
      return false;
    }
    const success = this.queue.add(event);
    if (!success) {
      this.totalOverflows++;
      debug('queue', `OVERFLOW: "${event.event}" rejected | size=${this.queue.size}/${this.queue.maxSize}`);
    } else {
      debug('queue', `Added: "${event.event}" | size=${this.queue.size}/${this.queue.maxSize} (${(this.getUtilization() * 100).toFixed(1)}%)`);
    }

    // Threshold check
    const utilization = this.getUtilization();
    if (utilization >= this.threshold && this.thresholdCallback) {
      debug('queue', `Threshold hit: ${(utilization * 100).toFixed(1)}% >= ${(this.threshold * 100).toFixed(1)}%`);
      this.thresholdCallback(this.queue.size, utilization);
    }

    return success;
  }

  getBatch(count) {
    return this.queue.getBatch(count);
  }

  returnItems(items) {
    this.queue.returnItems(items);
  }

  get size() {
    return this.queue.size;
  }

  getUtilization() {
    return this.queue.maxSize ? this.queue.size / this.queue.maxSize : 0;
  }

  updateMaxSize(newMax) {
    this.queue.updateMaxSize(newMax);
    console.log(`[EventQueue] Max size updated to ${newMax}`);
  }

  clear() {
    return this.queue.clear();
  }

  getStats() {
    return {
      ...this.queue.getStats(),
      utilization: +this.getUtilization().toFixed(3),
      totalOverflows: this.totalOverflows,
    };
  }
}

// --- System 5: Batch Coordinator ---

class BatchCoordinator {
  constructor(apiClient, { batchSize = 50, intervalMs = 10000 } = {}) {
    this.apiClient = apiClient;
    this.batchSize = batchSize;
    this.intervalMs = intervalMs;
    this.currentTier = 0;
    this.lastBatchTime = Date.now();

    this.stats = { batchesSent: 0, successfulBatches: 0, failedBatches: 0, totalEventsSent: 0 };

    this.onSuccess = null;
    this.onFailure = null;
  }

  shouldSend(queueSize) {
    const timeSinceLastBatch = Date.now() - this.lastBatchTime;
    if (timeSinceLastBatch >= this.intervalMs && queueSize > 0) return true;
    if (queueSize >= this.batchSize) return true;
    return false;
  }

  async sendBatch(events) {
    if (!events.length) return null;

    const startTime = Date.now();
    const estimatedSize = estimateBatchSize(events);

    debug('queue', `Sending batch: ${events.length} events (~${(estimatedSize / 1024).toFixed(1)}KB) | tier=${this.currentTier}`);

    try {
      const result = await this.apiClient.sendBatch(events, { autoSplit: true });
      const responseTime = Date.now() - startTime;

      this.stats.batchesSent++;
      this.lastBatchTime = Date.now();

      if (result.success) {
        this.stats.successfulBatches++;
        this.stats.totalEventsSent += result.eventsSent || events.length;
        debug('queue', `Batch OK: ${result.eventsSent || events.length} sent in ${responseTime}ms`);
        if (this.onSuccess) this.onSuccess(result);
      } else {
        this.stats.failedBatches++;
        debug('queue', `Batch FAILED: ${result.error || 'unknown'} in ${responseTime}ms`);
        if (this.onFailure) this.onFailure(result);
      }

      return {
        ...result,
        responseTime,
        tier: this.currentTier,
        batchSizeBytes: estimatedSize,
      };
    } catch (err) {
      this.stats.batchesSent++;
      this.stats.failedBatches++;
      this.lastBatchTime = Date.now();
      debug('queue', `Batch ERROR: ${err.message}`);
      const errorResult = { success: false, error: err.message, eventsFailed: events.length };
      if (this.onFailure) this.onFailure(errorResult);
      return errorResult;
    }
  }

  updateConfig({ batchSize, intervalMs, tier }) {
    if (batchSize !== undefined) this.batchSize = batchSize;
    if (intervalMs !== undefined) this.intervalMs = intervalMs;
    if (tier !== undefined) this.currentTier = tier;
    console.log(`[BatchCoordinator] Config updated: batch=${this.batchSize}, interval=${this.intervalMs}ms, tier=${this.currentTier}`);
  }

  getStats() {
    const total = this.stats.batchesSent || 1;
    return {
      ...this.stats,
      successRate: +(this.stats.successfulBatches / total).toFixed(3),
      avgBatchSize: this.stats.successfulBatches ? Math.round(this.stats.totalEventsSent / this.stats.successfulBatches) : 0,
    };
  }
}

// --- System 6: Infrastructure Monitor ---

class InfrastructureMonitor {
  constructor(stateFileWriter, scalingManager) {
    this.stateWriter = stateFileWriter;
    this.scalingManager = scalingManager;
    this.startTime = Date.now();

    this.metrics = {
      totalEventsProcessed: 0,
      categoryBreakdown: {},
      consecutiveApiFailures: 0,
      lastApiSuccess: null,
    };
  }

  recordEvent(flowCategory) {
    this.metrics.totalEventsProcessed++;
    this.metrics.categoryBreakdown[flowCategory] = (this.metrics.categoryBreakdown[flowCategory] || 0) + 1;
  }

  recordApiSuccess() {
    this.metrics.consecutiveApiFailures = 0;
    this.metrics.lastApiSuccess = new Date().toISOString();
  }

  recordApiFailure() {
    this.metrics.consecutiveApiFailures++;
  }

  writeHeartbeat(queueStats, batchStats) {
    const data = {
      timestamp: new Date().toISOString(),
      eventsProcessed: this.metrics.totalEventsProcessed,
      queueSize: queueStats.currentSize,
      queueMax: queueStats.maxSize,
      queueUtilization: queueStats.utilization,
      uptime: Math.round((Date.now() - this.startTime) / 1000),
      consecutiveApiFailures: this.metrics.consecutiveApiFailures,
      lastApiSuccess: this.metrics.lastApiSuccess,
      currentTier: this.scalingManager.currentTierIndex,
      batchConfig: {
        batchSize: this.scalingManager.currentTier.batchSize,
        interval: this.scalingManager.currentTier.interval,
      },
    };
    this.stateWriter.writeJsonAtomic('heartbeat.json', data);
  }

  writeDailyStats(queueStats, batchStats) {
    const data = {
      timestamp: new Date().toISOString(),
      totalEventsProcessed: this.metrics.totalEventsProcessed,
      categoryBreakdown: this.metrics.categoryBreakdown,
      apiSuccessRate: batchStats.successRate,
      batchStats,
      uptime: Math.round((Date.now() - this.startTime) / 1000),
      queueState: queueStats,
      scalingState: this.scalingManager.getState(),
    };
    this.stateWriter.writeJsonAtomic('daily_stats.json', data);
  }

  writeAlertTrigger(alertType, data) {
    this.stateWriter.mergeJson('alert_triggers.json', {
      [alertType]: { triggered: true, timestamp: new Date().toISOString(), ...data },
    });
  }

  writeScalingState() {
    this.stateWriter.writeJsonAtomic('scaling_state.json', this.scalingManager.getState());
  }

  checkAnomalies() {
    const anomalies = this.scalingManager.detectAnomalies();
    if (anomalies.length) {
      this.writeAlertTrigger('scaling_anomaly', { anomalies });
    }
    return anomalies;
  }

  getSummary(queueStats, batchStats) {
    return {
      queue: queueStats,
      batch: batchStats,
      scaling: this.scalingManager.getState(),
      events: {
        total: this.metrics.totalEventsProcessed,
        breakdown: this.metrics.categoryBreakdown,
      },
      health: {
        consecutiveApiFailures: this.metrics.consecutiveApiFailures,
        lastApiSuccess: this.metrics.lastApiSuccess,
        uptime: Math.round((Date.now() - this.startTime) / 1000),
      },
    };
  }

  writeShutdownSummary(queueStats, batchStats) {
    this.scalingManager.updateTierTime();
    const summary = this.getSummary(queueStats, batchStats);
    summary.shutdownTime = new Date().toISOString();
    this.stateWriter.writeJsonAtomic('shutdown_summary.json', summary);
    this.writeHeartbeat(queueStats, batchStats);
    this.writeDailyStats(queueStats, batchStats);
    this.writeScalingState();
  }
}

// --- System 7: Processing Coordinator ---

class ProcessingCoordinator {
  constructor(eventProcessor, eventQueue) {
    this.processor = eventProcessor;
    this.queue = eventQueue;
    this.stats = { totalProcessed: 0, successful: 0, failed: 0 };
  }

  processEvent(eventType, data) {
    try {
      const events = this.processor.process(eventType, data);
      let allOk = true;
      for (const event of events) {
        if (!this.queue.add(event)) allOk = false;
      }
      this.stats.totalProcessed++;
      if (allOk && events.length) this.stats.successful++;
      else if (!events.length) this.stats.successful++;
      else this.stats.failed++;
      debug('queue', `Coordinator: ${eventType} -> ${events.length} event(s) | total=${this.stats.totalProcessed} ok=${this.stats.successful} fail=${this.stats.failed}`);
      return events.length;
    } catch (err) {
      console.error(`[ProcessingCoordinator] Error:`, err.message);
      this.stats.totalProcessed++;
      this.stats.failed++;
      return 0;
    }
  }

  getStats() {
    return { ...this.stats };
  }
}

module.exports = {
  ScalingTier,
  AdaptiveScalingManager,
  DEFAULT_TIERS,
  MemoryQueue,
  EventQueue,
  BatchCoordinator,
  InfrastructureMonitor,
  ProcessingCoordinator,
};
