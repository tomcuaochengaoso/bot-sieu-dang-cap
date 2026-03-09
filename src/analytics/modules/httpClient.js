// HTTP API Communication Module (Guide #1)
// Reliable data transmission with retry, batch splitting, and metrics

const { TemporaryError, PermanentError, SizeViolationError } = require('../errors/apiErrors');

// --- Constants (Guide #1 - Component 5) ---
const MAX_BATCH_ITEMS = 2000;
const MAX_BATCH_BYTES = 2 * 1024 * 1024; // 2 MB
const SAFE_BATCH_BYTES = Math.floor(MAX_BATCH_BYTES * 0.9);
const AVG_ITEM_SIZE = 500;

// --- Component 3: HTTP Engine ---
class HttpEngine {
  constructor(timeout = 30000) {
    this.timeout = timeout;
    this.stats = { requests: 0, errors: 0 };
  }

  async post(url, body, headers) {
    this.stats.requests++;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);

    try {
      const res = await fetch(url, {
        method: 'POST',
        body,
        headers,
        signal: controller.signal,
      });

      if (res.status >= 500) {
        this.stats.errors++;
        throw new TemporaryError(`Server error: ${res.status}`, res.status);
      }
      if (res.status === 429) {
        this.stats.errors++;
        throw new TemporaryError('Rate limited', 429);
      }
      if (res.status === 413) {
        this.stats.errors++;
        throw new PermanentError('Payload too large', 413);
      }
      if (res.status >= 400) {
        this.stats.errors++;
        throw new PermanentError(`Client error: ${res.status}`, res.status);
      }

      try {
        return await res.json();
      } catch {
        return { status: 1 };
      }
    } catch (err) {
      if (err instanceof TemporaryError || err instanceof PermanentError) throw err;
      this.stats.errors++;
      throw new TemporaryError(`Network error: ${err.message}`);
    } finally {
      clearTimeout(timer);
    }
  }
}

// --- Component 4: Retry Policy ---
class RetryPolicy {
  constructor({ maxRetries = 5, baseDelay = 1000, maxDelay = 30000, jitter = true } = {}) {
    this.maxRetries = maxRetries;
    this.baseDelay = baseDelay;
    this.maxDelay = maxDelay;
    this.jitter = jitter;
    this.retryCount = 0;
  }

  _calculateDelay(attempt) {
    let delay = Math.min(this.baseDelay * Math.pow(2, attempt), this.maxDelay);
    if (this.jitter) delay += Math.random() * delay * 0.1;
    return delay;
  }

  async execute(operation) {
    let lastError;
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const result = await operation();
        this.retryCount = 0;
        return result;
      } catch (err) {
        if (err instanceof PermanentError || err instanceof SizeViolationError) throw err;
        lastError = err;
        if (attempt < this.maxRetries) {
          this.retryCount++;
          const delay = this._calculateDelay(attempt);
          await new Promise(r => setTimeout(r, delay));
        }
      }
    }
    throw lastError;
  }
}

// --- Component 5: Data Transformation ---
function encodeBatch(events) {
  if (events.length > MAX_BATCH_ITEMS) {
    throw new SizeViolationError(`Batch exceeds max items: ${events.length} > ${MAX_BATCH_ITEMS}`);
  }
  const json = JSON.stringify(events);
  const bytes = Buffer.from(json, 'utf-8');
  if (bytes.length > MAX_BATCH_BYTES) {
    throw new SizeViolationError(`Batch exceeds max size: ${bytes.length} > ${MAX_BATCH_BYTES}`);
  }
  return bytes;
}

function estimateBatchSize(events) {
  if (events.length <= 5) return events.length * AVG_ITEM_SIZE;
  if (events.length <= 50) {
    const sample = events.slice(0, 5);
    const avgSample = Buffer.from(JSON.stringify(sample), 'utf-8').length / 5;
    return Math.ceil(avgSample * events.length * 1.1);
  }
  return Buffer.from(JSON.stringify(events), 'utf-8').length;
}

function isBatchSafe(events) {
  if (events.length > MAX_BATCH_ITEMS) return false;
  return estimateBatchSize(events) <= SAFE_BATCH_BYTES;
}

function splitBatch(events) {
  if (isBatchSafe(events)) return [events];
  const mid = Math.ceil(events.length / 2);
  return [...splitBatch(events.slice(0, mid)), ...splitBatch(events.slice(mid))];
}

function createAuthHeaders(token) {
  const encoded = Buffer.from(`${token}:`, 'utf-8').toString('base64');
  return {
    'Authorization': `Basic ${encoded}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'User-Agent': 'ivan-bot/1.0',
  };
}

function validateBatch(events) {
  const errors = [];
  if (!events.length) errors.push('Batch is empty');
  if (events.length > MAX_BATCH_ITEMS) errors.push(`Too many items: ${events.length}`);
  if (estimateBatchSize(events) > MAX_BATCH_BYTES) errors.push('Estimated size exceeds limit');
  for (let i = 0; i < events.length; i++) {
    const e = events[i];
    if (typeof e !== 'object' || e === null) { errors.push(`Item ${i} is not an object`); continue; }
    if (!e.event) errors.push(`Item ${i} missing "event" field`);
    if (!e.properties) errors.push(`Item ${i} missing "properties" field`);
    else {
      if (!e.properties.time) errors.push(`Item ${i} missing "properties.time"`);
      if (!e.properties.distinct_id) errors.push(`Item ${i} missing "properties.distinct_id"`);
    }
  }
  return errors;
}

// --- Component 6: API Orchestrator ---
class ApiOrchestrator {
  constructor(httpEngine, retryPolicy, token, endpoint) {
    this.http = httpEngine;
    this.retry = retryPolicy;
    this.token = token;
    this.endpoint = endpoint;
    this.stats = { eventsSent: 0, batchesSent: 0, bytesSent: 0, failedBatches: 0 };
  }

  async sendBatch(events, { autoSplit = true, validate = false } = {}) {
    if (!events.length) return { success: true, eventsSent: 0 };

    if (validate) {
      const errors = validateBatch(events);
      if (errors.length) return { success: false, errors };
    }

    if (!isBatchSafe(events) && autoSplit) {
      return this._sendSplitBatch(events);
    }
    return this._sendSingleBatch(events);
  }

  async _sendSingleBatch(events) {
    try {
      const body = encodeBatch(events);
      const headers = createAuthHeaders(this.token);
      const url = `${this.endpoint}?strict=1`;

      const response = await this.retry.execute(() => this.http.post(url, body, headers));

      this.stats.eventsSent += events.length;
      this.stats.batchesSent++;
      this.stats.bytesSent += body.length;

      const hasError = response && (response.status === 0 || response.error);
      return {
        success: !hasError,
        eventsSent: hasError ? 0 : events.length,
        eventsFailed: hasError ? events.length : 0,
        bytes: body.length,
        response,
        timestamp: new Date().toISOString(),
      };
    } catch (err) {
      this.stats.failedBatches++;
      return { success: false, eventsSent: 0, eventsFailed: events.length, error: err.message, timestamp: new Date().toISOString() };
    }
  }

  async _sendSplitBatch(events) {
    const chunks = splitBatch(events);
    const results = [];
    for (const chunk of chunks) {
      results.push(await this._sendSingleBatch(chunk));
      await new Promise(r => setTimeout(r, 100));
    }
    const totalSent = results.reduce((s, r) => s + (r.eventsSent || 0), 0);
    const totalFailed = results.reduce((s, r) => s + (r.eventsFailed || 0), 0);
    return {
      success: results.every(r => r.success),
      eventsSent: totalSent,
      eventsFailed: totalFailed,
      chunks: results.length,
      timestamp: new Date().toISOString(),
    };
  }

  getStats() {
    const total = this.stats.batchesSent + this.stats.failedBatches;
    return {
      ...this.stats,
      successRate: total ? this.stats.batchesSent / total : 0,
      avgBatchSize: this.stats.batchesSent ? Math.round(this.stats.eventsSent / this.stats.batchesSent) : 0,
      megabytesSent: +(this.stats.bytesSent / (1024 * 1024)).toFixed(3),
    };
  }
}

// --- Component 7: Factory ---
function createProductionClient(token, endpoint) {
  const http = new HttpEngine(30000);
  const retry = new RetryPolicy({ maxRetries: 5, baseDelay: 1000, maxDelay: 30000, jitter: true });
  return new ApiOrchestrator(http, retry, token, endpoint);
}

function createTestClient(mockHttp, token = 'test', endpoint = 'http://localhost') {
  const retry = new RetryPolicy({ maxRetries: 1, baseDelay: 100, maxDelay: 500, jitter: false });
  return new ApiOrchestrator(mockHttp, retry, token, endpoint);
}

module.exports = {
  HttpEngine,
  RetryPolicy,
  ApiOrchestrator,
  createProductionClient,
  createTestClient,
  encodeBatch,
  estimateBatchSize,
  isBatchSafe,
  splitBatch,
  createAuthHeaders,
  validateBatch,
  MAX_BATCH_ITEMS,
  MAX_BATCH_BYTES,
  SAFE_BATCH_BYTES,
};
