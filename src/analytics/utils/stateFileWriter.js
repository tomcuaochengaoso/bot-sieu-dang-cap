// State File Writer (Guide #4 - System 1)
// Atomic file operations for monitoring data

const fs = require('fs');
const path = require('path');
const os = require('os');

let fcntl = null;
try {
  // File locking available on Unix
  fcntl = require('fs');
} catch {}

class StateFileWriter {
  constructor(stateDir) {
    this.stateDir = stateDir;
    fs.mkdirSync(stateDir, { recursive: true });
  }

  writeJsonAtomic(filename, data) {
    const filePath = path.join(this.stateDir, filename);
    const tmpPath = filePath + '.tmp';
    try {
      const content = JSON.stringify(data, null, 2);
      fs.writeFileSync(tmpPath, content, 'utf-8');
      fs.renameSync(tmpPath, filePath);
    } catch (err) {
      try { fs.unlinkSync(tmpPath); } catch {}
      console.error(`[StateFileWriter] Failed to write ${filename}:`, err.message);
    }
  }

  appendToJsonArray(filename, item, maxSize = 100) {
    const filePath = path.join(this.stateDir, filename);
    let arr = [];
    try {
      arr = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      if (!Array.isArray(arr)) arr = [];
    } catch {}
    arr.push(item);
    if (arr.length > maxSize) arr = arr.slice(arr.length - maxSize);
    this.writeJsonAtomic(filename, arr);
  }

  mergeJson(filename, updates) {
    const filePath = path.join(this.stateDir, filename);
    let data = {};
    try {
      data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } catch {}
    Object.assign(data, updates);
    this.writeJsonAtomic(filename, data);
  }

  writeFlag(filename) {
    const filePath = path.join(this.stateDir, filename);
    fs.writeFileSync(filePath, '', 'utf-8');
  }

  removeFlag(filename) {
    const filePath = path.join(this.stateDir, filename);
    try { fs.unlinkSync(filePath); } catch {}
  }

  flagExists(filename) {
    return fs.existsSync(path.join(this.stateDir, filename));
  }

  readJson(filename) {
    try {
      return JSON.parse(fs.readFileSync(path.join(this.stateDir, filename), 'utf-8'));
    } catch {
      return null;
    }
  }
}

module.exports = StateFileWriter;
