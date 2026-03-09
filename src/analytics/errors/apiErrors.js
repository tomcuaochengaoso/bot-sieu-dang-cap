// Error hierarchy for API communication (Guide #1 - Component 1)
// Error types encode retry decision logic

class ApiError extends Error {
  constructor(message, statusCode = null) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
  }
}

class TemporaryError extends ApiError {
  constructor(message, statusCode = null) {
    super(message, statusCode);
    this.name = 'TemporaryError';
  }
}

class PermanentError extends ApiError {
  constructor(message, statusCode = null) {
    super(message, statusCode);
    this.name = 'PermanentError';
  }
}

class SizeViolationError extends ApiError {
  constructor(message) {
    super(message);
    this.name = 'SizeViolationError';
  }
}

module.exports = { ApiError, TemporaryError, PermanentError, SizeViolationError };
