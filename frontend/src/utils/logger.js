/**
 * Advanced Logging and Debugging System
 */

export class Logger {
  constructor(name = 'App', options = {}) {
    this.name = name;
    this.level = options.level || (process.env.NODE_ENV === 'development' ? 'debug' : 'info');
    this.enableConsole = options.enableConsole !== false;
    this.enableStorage = options.enableStorage || false;
    this.maxStorageSize = options.maxStorageSize || 1000;
    this.logs = [];
    
    this.levels = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3
    };

    this.colors = {
      debug: '#6B7280',
      info: '#3B82F6',
      warn: '#F59E0B',
      error: '#EF4444'
    };
  }

  log(level, message, data = null) {
    const levelNum = this.levels[level];
    const currentLevelNum = this.levels[this.level];

    if (levelNum < currentLevelNum) return;

    // Create a key for duplicate detection
    const logKey = `${level}:${this.name}:${message}`;
    const now = Date.now();
    
    // Check for duplicate logs within 1 second (except for errors)
    if (level !== 'error' && this.lastLogs && this.lastLogs.has(logKey)) {
      const lastTime = this.lastLogs.get(logKey);
      if (now - lastTime < 1000) {
        return; // Skip duplicate log
      }
    }
    
    // Initialize lastLogs if not exists
    if (!this.lastLogs) {
      this.lastLogs = new Map();
    }
    
    // Update last log time
    this.lastLogs.set(logKey, now);

    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      name: this.name,
      message,
      data,
      stack: level === 'error' ? new Error().stack : null
    };

    // Store log if enabled
    if (this.enableStorage) {
      this.logs.push(logEntry);
      if (this.logs.length > this.maxStorageSize) {
        this.logs.shift();
      }
    }

    // Console output if enabled
    if (this.enableConsole) {
      this.outputToConsole(logEntry);
    }

    return logEntry;
  }

  debug(message, data) {
    return this.log('debug', message, data);
  }

  info(message, data) {
    return this.log('info', message, data);
  }

  warn(message, data) {
    return this.log('warn', message, data);
  }

  error(message, data) {
    return this.log('error', message, data);
  }

  outputToConsole(logEntry) {
    const { level, name, message, data, timestamp } = logEntry;
    const color = this.colors[level];
    const time = new Date(timestamp).toLocaleTimeString();

    const style = `color: ${color}; font-weight: bold;`;
    const nameStyle = 'color: #8B5CF6; font-weight: bold;';

    if (data) {
      console.groupCollapsed(`%c[${level.toUpperCase()}]%c [${name}] %c${time} - ${message}`, style, nameStyle, 'color: #6B7280;');
      console.log('Data:', data);
      if (logEntry.stack) {
        console.log('Stack:', logEntry.stack);
      }
      console.groupEnd();
    } else {
      console.log(`%c[${level.toUpperCase()}]%c [${name}] %c${time} - ${message}`, style, nameStyle, 'color: #6B7280;');
    }
  }

  // Performance timing
  time(label) {
    const key = `${this.name}:${label}`;
    console.time(key);
    return key;
  }

  timeEnd(key) {
    console.timeEnd(key);
  }

  // Group logging
  group(title) {
    console.group(`[${this.name}] ${title}`);
  }

  groupEnd() {
    console.groupEnd();
  }

  // Get stored logs
  getLogs(level = null) {
    if (level) {
      return this.logs.filter(log => log.level === level);
    }
    return [...this.logs];
  }

  // Clear stored logs
  clearLogs() {
    this.logs = [];
  }

  // Export logs
  exportLogs() {
    return JSON.stringify(this.logs, null, 2);
  }

  // Create child logger
  child(name, options = {}) {
    return new Logger(`${this.name}:${name}`, {
      ...options,
      level: options.level || this.level,
      enableConsole: options.enableConsole !== undefined ? options.enableConsole : this.enableConsole,
      enableStorage: options.enableStorage !== undefined ? options.enableStorage : this.enableStorage
    });
  }
}

// Performance monitoring
export class PerformanceMonitor {
  constructor(logger) {
    this.logger = logger;
    this.metrics = new Map();
    this.observers = [];
  }

  // Measure function execution time
  measure(name, fn) {
    const start = performance.now();
    
    try {
      const result = fn();
      
      if (result instanceof Promise) {
        return result.finally(() => {
          const end = performance.now();
          this.recordMetric(name, end - start);
        });
      } else {
        const end = performance.now();
        this.recordMetric(name, end - start);
        return result;
      }
    } catch (error) {
      const end = performance.now();
      this.recordMetric(name, end - start, error);
      throw error;
    }
  }

  // Record a metric
  recordMetric(name, duration, error = null) {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, {
        count: 0,
        totalTime: 0,
        minTime: Infinity,
        maxTime: 0,
        avgTime: 0,
        errors: 0
      });
    }

    const metric = this.metrics.get(name);
    metric.count++;
    metric.totalTime += duration;
    metric.minTime = Math.min(metric.minTime, duration);
    metric.maxTime = Math.max(metric.maxTime, duration);
    metric.avgTime = metric.totalTime / metric.count;

    if (error) {
      metric.errors++;
    }

    // Log slow operations
    if (duration > 100) {
      this.logger.warn(`Slow operation detected: ${name}`, {
        duration: `${duration.toFixed(2)}ms`,
        error: error?.message
      });
    }

    // Notify observers
    this.observers.forEach(observer => {
      try {
        observer(name, duration, error);
      } catch (err) {
        this.logger.error('Error in performance observer', err);
      }
    });
  }

  // Get metrics
  getMetrics() {
    const result = {};
    for (const [name, metric] of this.metrics) {
      result[name] = { ...metric };
    }
    return result;
  }

  // Add observer
  addObserver(callback) {
    this.observers.push(callback);
    return () => {
      const index = this.observers.indexOf(callback);
      if (index > -1) {
        this.observers.splice(index, 1);
      }
    };
  }

  // Clear metrics
  clearMetrics() {
    this.metrics.clear();
  }
}

// Error tracking
export class ErrorTracker {
  constructor(logger) {
    this.logger = logger;
    this.errors = [];
    this.maxErrors = 100;
    this.setupGlobalHandlers();
  }

  setupGlobalHandlers() {
    // Catch unhandled errors
    window.addEventListener('error', (event) => {
      this.trackError(event.error, {
        type: 'unhandled',
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      });
    });

    // Catch unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.trackError(event.reason, {
        type: 'unhandledRejection'
      });
    });
  }

  trackError(error, context = {}) {
    const errorEntry = {
      timestamp: new Date().toISOString(),
      message: error.message || String(error),
      stack: error.stack,
      name: error.name,
      context,
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    this.errors.push(errorEntry);
    
    if (this.errors.length > this.maxErrors) {
      this.errors.shift();
    }

    this.logger.error('Error tracked', errorEntry);

    return errorEntry;
  }

  getErrors() {
    return [...this.errors];
  }

  clearErrors() {
    this.errors = [];
  }

  exportErrors() {
    return JSON.stringify(this.errors, null, 2);
  }
}

// Create default instances
export const logger = new Logger('TreeHole', {
  enableStorage: true,
  level: process.env.NODE_ENV === 'development' ? 'debug' : 'info'
});

export const performanceMonitor = new PerformanceMonitor(logger);
export const errorTracker = new ErrorTracker(logger);

// Utility functions
export const createLogger = (name, options) => new Logger(name, options);

export const withLogging = (name, fn) => {
  return (...args) => {
    return performanceMonitor.measure(name, () => fn(...args));
  };
};

export const logAsync = async (name, promise) => {
  const start = performance.now();
  try {
    const result = await promise;
    const duration = performance.now() - start;
    logger.debug(`Async operation completed: ${name}`, { duration: `${duration.toFixed(2)}ms` });
    return result;
  } catch (error) {
    const duration = performance.now() - start;
    logger.error(`Async operation failed: ${name}`, { 
      duration: `${duration.toFixed(2)}ms`,
      error: error.message 
    });
    throw error;
  }
};