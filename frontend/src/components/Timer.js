import { globalEventBus, EVENTS } from '../utils/eventBus.js';
import { logger } from '../utils/logger.js';

export class TimerComponent {
  constructor(options = {}) {
    this.duration = 0; // in seconds
    this.remaining = 0;
    this.isRunning = false;
    this.isPaused = false;
    this.intervalId = null;
    this.startTime = null;
    this.pausedTime = 0;
    this.logger = logger.child('TimerComponent');
    
    // Configuration
    this.config = {
      minMinutes: options.minMinutes || 5,
      maxMinutes: options.maxMinutes || 15,
      tickInterval: options.tickInterval || 1000,
      warningThreshold: options.warningThreshold || 60, // seconds
      criticalThreshold: options.criticalThreshold || 30, // seconds
      autoSave: options.autoSave !== false
    };
    
    // State tracking
    this.state = {
      phase: 'idle', // idle, running, paused, warning, critical, ended
      extensions: [],
      totalExtensions: 0,
      sessionStartTime: null
    };
    
    // Callbacks (legacy support)
    this.callbacks = {
      onTick: [],
      onTimeUp: [],
      onExtended: [],
      onWarning: [],
      onCritical: [],
      onStateChange: []
    };

    // Performance tracking
    this.performance = {
      tickCount: 0,
      averageTickTime: 0,
      lastTickTime: 0
    };

    this.setupEventListeners();
  }

  generateRandomDuration() {
    // Generate random time between configured min-max minutes
    const minSeconds = this.config.minMinutes * 60;
    const maxSeconds = this.config.maxMinutes * 60;
    const randomSeconds = Math.floor(Math.random() * (maxSeconds - minSeconds + 1)) + minSeconds;
    
    this.duration = randomSeconds;
    this.remaining = randomSeconds;
    this.pausedTime = 0;
    
    this.logger.info('Generated random duration', { 
      minutes: Math.floor(randomSeconds / 60),
      seconds: randomSeconds 
    });
    
    this.setState('idle');
    this.triggerCallback('onStateChange', this.getState());
    
    return randomSeconds;
  }

  start() {
    if (this.isRunning) {
      this.logger.warn('Timer already running');
      return false;
    }
    
    this.logger.info('Starting timer', { remaining: this.remaining });
    
    this.isRunning = true;
    this.isPaused = false;
    this.startTime = Date.now() - this.pausedTime;
    
    if (!this.state.sessionStartTime) {
      this.state.sessionStartTime = Date.now();
    }
    
    this.setState('running');
    
    this.intervalId = setInterval(() => {
      this.tick();
    }, this.config.tickInterval);
    
    globalEventBus.emit(EVENTS.TIMER_STARTED, this.getState());
    this.triggerCallback('onStateChange', this.getState());
    
    return true;
  }

  tick() {
    const tickStart = performance.now();
    
    if (this.remaining > 0) {
      this.remaining--;
      this.performance.tickCount++;
      
      // Check for state changes
      this.checkStateTransitions();
      
      // Throttle tick events to reduce frequency (only emit every 1000ms)
      const now = Date.now();
      if (!this.lastTickEmit || now - this.lastTickEmit >= 1000) {
        globalEventBus.emit(EVENTS.TIMER_TICK, this.remaining);
        this.lastTickEmit = now;
      }
      
      this.triggerCallback('onTick', this.remaining);
      
      // Auto-save if enabled
      if (this.config.autoSave) {
        this.saveState();
      }
      
    } else {
      this.handleTimeUp();
    }
    
    // Performance tracking
    const tickEnd = performance.now();
    const tickTime = tickEnd - tickStart;
    this.performance.lastTickTime = tickTime;
    this.performance.averageTickTime = 
      (this.performance.averageTickTime * (this.performance.tickCount - 1) + tickTime) / 
      this.performance.tickCount;
  }

  checkStateTransitions() {
    const prevPhase = this.state.phase;
    
    if (this.remaining <= this.config.criticalThreshold && this.state.phase !== 'critical') {
      this.setState('critical');
      this.triggerCallback('onCritical', this.remaining);
      this.logger.warn('Timer entered critical phase', { remaining: this.remaining });
      
    } else if (this.remaining <= this.config.warningThreshold && this.state.phase === 'running') {
      this.setState('warning');
      this.triggerCallback('onWarning', this.remaining);
      this.logger.info('Timer entered warning phase', { remaining: this.remaining });
    }
    
    if (prevPhase !== this.state.phase) {
      this.triggerCallback('onStateChange', this.getState());
    }
  }

  handleTimeUp() {
    this.logger.info('Timer ended');
    
    this.stop();
    this.setState('ended');
    
    globalEventBus.emit(EVENTS.TIMER_ENDED, this.getState());
    this.triggerCallback('onTimeUp', this.getState());
    this.triggerCallback('onStateChange', this.getState());
  }

  pause() {
    if (!this.isRunning) {
      this.logger.warn('Timer not running, cannot pause');
      return false;
    }
    
    this.logger.info('Pausing timer', { remaining: this.remaining });
    
    this.isRunning = false;
    this.isPaused = true;
    this.pausedTime = Date.now() - this.startTime;
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    this.setState('paused');
    
    globalEventBus.emit(EVENTS.TIMER_PAUSED, this.getState());
    this.triggerCallback('onStateChange', this.getState());
    
    return true;
  }

  resume() {
    if (!this.isPaused) {
      this.logger.warn('Timer not paused, cannot resume');
      return false;
    }
    
    this.logger.info('Resuming timer', { remaining: this.remaining });
    return this.start();
  }

  stop() {
    this.logger.info('Stopping timer');
    
    this.isRunning = false;
    this.isPaused = false;
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    this.remaining = 0;
    this.pausedTime = 0;
    this.setState('idle');
    
    this.triggerCallback('onStateChange', this.getState());
    
    return true;
  }

  reset() {
    this.logger.info('Resetting timer');
    
    this.stop();
    this.generateRandomDuration();
    this.clearExtensions();
    this.performance = {
      tickCount: 0,
      averageTickTime: 0,
      lastTickTime: 0
    };
    
    globalEventBus.emit(EVENTS.TIMER_RESET, this.getState());
    
    return true;
  }

  extend(minutes) {
    const extensionSeconds = minutes * 60;
    this.remaining += extensionSeconds;
    this.triggerCallback('onExtended', minutes);
  }

  // Event callback methods
  onTick(callback) {
    this.callbacks.onTick.push(callback);
  }

  onTimeUp(callback) {
    this.callbacks.onTimeUp.push(callback);
  }

  onExtended(callback) {
    this.callbacks.onExtended.push(callback);
  }

  triggerCallback(eventName, ...args) {
    this.callbacks[eventName].forEach(callback => {
      try {
        callback(...args);
      } catch (error) {
        console.error(`Timer callback error (${eventName}):`, error);
      }
    });
  }

  getTimeDisplay() {
    const minutes = Math.floor(this.remaining / 60);
    const seconds = this.remaining % 60;
    const hours = Math.floor(minutes / 60);
    const displayMinutes = minutes % 60;
    
    return {
      hours: hours.toString().padStart(2, '0'),
      minutes: displayMinutes.toString().padStart(2, '0'),
      seconds: seconds.toString().padStart(2, '0'),
      total: this.remaining,
      formatted: hours > 0 ? 
        `${hours}:${displayMinutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}` :
        `${displayMinutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`,
      percentage: this.duration > 0 ? ((this.duration - this.remaining) / this.duration) * 100 : 0
    };
  }

  // Enhanced extension functionality
  extend(minutes, source = 'manual') {
    if (minutes <= 0) {
      this.logger.warn('Invalid extension amount', { minutes });
      return false;
    }
    
    const extensionSeconds = minutes * 60;
    const previousRemaining = this.remaining;
    
    this.remaining += extensionSeconds;
    this.duration += extensionSeconds; // Also extend total duration
    
    const extension = {
      id: Date.now() + Math.random(),
      minutes,
      seconds: extensionSeconds,
      source,
      timestamp: Date.now(),
      previousRemaining
    };
    
    this.state.extensions.push(extension);
    this.state.totalExtensions += minutes;
    
    this.logger.info('Timer extended', { 
      minutes, 
      source, 
      newRemaining: this.remaining,
      totalExtensions: this.state.totalExtensions
    });
    
    // Reset phase if we were in warning/critical
    if (this.remaining > this.config.warningThreshold) {
      this.setState('running');
    } else if (this.remaining > this.config.criticalThreshold) {
      this.setState('warning');
    }
    
    // Only emit if not from payment source (to avoid duplicates)
    if (source !== 'payment') {
      globalEventBus.emit(EVENTS.TIMER_EXTENDED, {
        minutes,
        source,
        extension,
        state: this.getState()
      });
    }
    
    this.triggerCallback('onExtended', extension);
    this.triggerCallback('onStateChange', this.getState());
    
    return extension;
  }

  // State management
  setState(phase) {
    const prevPhase = this.state.phase;
    this.state.phase = phase;
    
    if (prevPhase !== phase) {
      this.logger.debug('Timer phase changed', { from: prevPhase, to: phase });
    }
  }

  getState() {
    return {
      duration: this.duration,
      remaining: this.remaining,
      isRunning: this.isRunning,
      isPaused: this.isPaused,
      phase: this.state.phase,
      extensions: [...this.state.extensions],
      totalExtensions: this.state.totalExtensions,
      sessionStartTime: this.state.sessionStartTime,
      timeDisplay: this.getTimeDisplay(),
      performance: { ...this.performance }
    };
  }

  // Extension management
  clearExtensions() {
    this.state.extensions = [];
    this.state.totalExtensions = 0;
  }

  getExtensions() {
    return [...this.state.extensions];
  }

  getTotalExtensionTime() {
    return this.state.totalExtensions;
  }

  // Persistence
  saveState() {
    try {
      const state = {
        duration: this.duration,
        remaining: this.remaining,
        isRunning: this.isRunning,
        isPaused: this.isPaused,
        pausedTime: this.pausedTime,
        startTime: this.startTime,
        state: this.state,
        timestamp: Date.now()
      };
      
      localStorage.setItem('treehole_timer_state', JSON.stringify(state));
    } catch (error) {
      this.logger.error('Failed to save timer state', error);
    }
  }

  loadState() {
    try {
      const saved = localStorage.getItem('treehole_timer_state');
      if (!saved) return false;
      
      const state = JSON.parse(saved);
      
      // Check if state is not too old (1 hour)
      if (Date.now() - state.timestamp > 60 * 60 * 1000) {
        this.logger.info('Saved timer state too old, ignoring');
        return false;
      }
      
      this.duration = state.duration;
      this.remaining = state.remaining;
      this.pausedTime = state.pausedTime || 0;
      this.startTime = state.startTime;
      this.state = { ...this.state, ...state.state };
      
      // Don't restore running state - user needs to manually start
      this.isRunning = false;
      this.isPaused = state.isPaused;
      
      this.logger.info('Timer state loaded', { remaining: this.remaining });
      return true;
      
    } catch (error) {
      this.logger.error('Failed to load timer state', error);
      return false;
    }
  }

  clearSavedState() {
    localStorage.removeItem('treehole_timer_state');
  }

  // Event listeners setup
  setupEventListeners() {
    // Listen for payment events to auto-extend timer
    globalEventBus.on(EVENTS.PAYMENT_SUCCESS, (data) => {
      if (data.minutes) {
        this.extend(data.minutes, 'payment');
      }
    });

    // Listen for manual extension requests
    globalEventBus.on('timer:extend', (data) => {
      this.extend(data.minutes, data.source || 'manual');
    });

    // Listen for timer control events
    globalEventBus.on('timer:start', () => this.start());
    globalEventBus.on('timer:pause', () => this.pause());
    globalEventBus.on('timer:resume', () => this.resume());
    globalEventBus.on('timer:reset', () => this.reset());
    globalEventBus.on('timer:stop', () => this.stop());

    // Listen for visibility changes to pause/resume
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.isRunning) {
        this.logger.debug('Page hidden, timer continues running');
        // Note: We don't auto-pause on visibility change as the timer should continue
      }
    });

    // Listen for beforeunload to save state
    window.addEventListener('beforeunload', () => {
      if (this.config.autoSave) {
        this.saveState();
      }
    });
  }

  // Performance monitoring
  getPerformanceStats() {
    return {
      ...this.performance,
      uptime: this.state.sessionStartTime ? Date.now() - this.state.sessionStartTime : 0,
      efficiency: this.performance.tickCount > 0 ? 
        (this.performance.tickCount * this.config.tickInterval) / (Date.now() - (this.state.sessionStartTime || Date.now())) : 0
    };
  }

  // Cleanup
  destroy() {
    this.logger.info('Destroying timer component');
    
    this.stop();
    this.callbacks = {
      onTick: [],
      onTimeUp: [],
      onExtended: [],
      onWarning: [],
      onCritical: [],
      onStateChange: []
    };
    
    // Remove global event listeners
    globalEventBus.removeAllListeners('timer');
  }

  // Utility methods
  formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }

  getTimeUntilWarning() {
    return Math.max(0, this.remaining - this.config.warningThreshold);
  }

  getTimeUntilCritical() {
    return Math.max(0, this.remaining - this.config.criticalThreshold);
  }

  isInWarningPhase() {
    return this.state.phase === 'warning' || this.state.phase === 'critical';
  }

  isInCriticalPhase() {
    return this.state.phase === 'critical';
  }
}