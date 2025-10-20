/**
 * Timer UI Component
 * Handles the visual representation and animations of the timer
 */

import { globalEventBus, EVENTS } from '../utils/eventBus.js';
import { logger } from '../utils/logger.js';

export class TimerUI {
  constructor(container, timerComponent) {
    this.container = container;
    this.timer = timerComponent;
    this.logger = logger.child('TimerUI');
    this.isAnimating = false;
    this.lastState = null;
    
    // Animation settings
    this.animations = {
      extendDuration: 1000,
      warningPulse: 2000,
      criticalPulse: 1000,
      progressTransition: 1000
    };
    
    this.setupEventListeners();
    this.render();
  }

  setupEventListeners() {
    // Listen to timer events
    this.timer.onTick((remaining) => {
      this.updateDisplay(remaining);
    });

    this.timer.onExtended((extension) => {
      this.animateExtension(extension);
    });

    this.timer.onWarning((remaining) => {
      this.enterWarningMode();
    });

    this.timer.onCritical((remaining) => {
      this.enterCriticalMode();
    });

    this.timer.onTimeUp(() => {
      this.showTimeUpAnimation();
    });

    this.timer.onStateChange((state) => {
      this.updateStateDisplay(state);
    });

    // Global events
    globalEventBus.on(EVENTS.TIMER_EXTENDED, (data) => {
      this.showExtensionNotification(data);
    });
  }

  render() {
    const state = this.timer.getState();
    const timeDisplay = this.timer.getTimeDisplay();
    
    this.container.innerHTML = `
      <div class="timer-container">
        ${this.renderProgressRing(state)}
        ${this.renderTimeDisplay(timeDisplay, state)}
        ${this.renderControls(state)}
        ${this.renderExtensions(state)}
        ${this.renderStats(state)}
      </div>
    `;
    
    this.attachEventListeners();
    this.updateProgressRing(state);
  }

  renderProgressRing(state) {
    const radius = 120;
    const circumference = 2 * Math.PI * radius;
    const percentage = state.duration > 0 ? 
      ((state.duration - state.remaining) / state.duration) * 100 : 0;
    
    return `
      <div class="timer-progress">
        <svg viewBox="0 0 260 260">
          <circle
            class="progress-bg"
            cx="130"
            cy="130"
            r="${radius}"
          />
          <circle
            class="progress-bar ${this.getProgressClass(state)}"
            cx="130"
            cy="130"
            r="${radius}"
            stroke-dasharray="${circumference}"
            stroke-dashoffset="${circumference - (percentage / 100) * circumference}"
            id="timer-progress-bar"
          />
        </svg>
        <div class="timer-text">
          <div class="timer-number" id="timer-display">
            ${this.formatTimeForDisplay(state.remaining)}
          </div>
          <div class="timer-label">
            ${this.getStatusLabel(state)}
          </div>
        </div>
      </div>
    `;
  }

  renderTimeDisplay(timeDisplay, state) {
    return `
      <div class="timer-display">
        <div class="time ${this.getTimeClass(state)}" id="main-timer">
          ${timeDisplay.formatted}
        </div>
        <div class="status ${this.getStatusClass(state)}" id="timer-status">
          ${this.getStatusMessage(state)}
        </div>
      </div>
    `;
  }

  renderControls(state) {
    const canStart = !state.isRunning && !state.isPaused && state.remaining > 0;
    const canPause = state.isRunning;
    const canResume = state.isPaused;
    const canReset = state.remaining !== state.duration || state.extensions.length > 0;
    
    return `
      <div class="timer-controls">
        ${canStart ? `
          <button class="timer-btn primary" id="timer-start">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="5,3 19,12 5,21"/>
            </svg>
            Start
          </button>
        ` : ''}
        
        ${canPause ? `
          <button class="timer-btn secondary" id="timer-pause">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="6" y="4" width="4" height="16"/>
              <rect x="14" y="4" width="4" height="16"/>
            </svg>
            Pause
          </button>
        ` : ''}
        
        ${canResume ? `
          <button class="timer-btn primary" id="timer-resume">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="5,3 19,12 5,21"/>
            </svg>
            Resume
          </button>
        ` : ''}
        
        <button class="timer-btn secondary" id="timer-reset" ${!canReset ? 'disabled' : ''}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="23,4 23,10 17,10"/>
            <polyline points="1,20 1,14 7,14"/>
            <path d="M20.49,9A9,9,0,0,0,5.64,5.64L1,10m22,4a9,9,0,0,1-14.85,3.36L23,14"/>
          </svg>
          Reset
        </button>
      </div>
    `;
  }

  renderExtensions(state) {
    if (state.extensions.length === 0) return '';
    
    const recentExtensions = state.extensions.slice(-3); // Show last 3 extensions
    
    return `
      <div class="timer-extensions">
        <h4 class="text-sm font-semibold text-gray-300 mb-2">Recent Extensions</h4>
        ${recentExtensions.map(ext => `
          <div class="extension-item">
            <div class="extension-info">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              <span class="extension-time">+${ext.minutes} min</span>
              <span class="extension-source">(${ext.source})</span>
            </div>
            <div class="text-xs text-green-300">
              ${new Date(ext.timestamp).toLocaleTimeString()}
            </div>
          </div>
        `).join('')}
        
        ${state.extensions.length > 3 ? `
          <div class="text-xs text-gray-400 text-center mt-2">
            +${state.extensions.length - 3} more extensions
          </div>
        ` : ''}
      </div>
    `;
  }

  renderStats(state) {
    const performance = this.timer.getPerformanceStats();
    
    return `
      <div class="timer-stats mt-6 p-4 bg-gray-800/50 rounded-lg">
        <h4 class="text-sm font-semibold text-gray-300 mb-3">Session Stats</h4>
        <div class="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span class="text-gray-400">Total Extensions:</span>
            <span class="font-mono font-bold text-green-400 ml-2">
              ${state.totalExtensions} min
            </span>
          </div>
          <div>
            <span class="text-gray-400">Session Time:</span>
            <span class="font-mono font-bold text-blue-400 ml-2">
              ${this.formatDuration(performance.uptime)}
            </span>
          </div>
          <div>
            <span class="text-gray-400">Progress:</span>
            <span class="font-mono font-bold text-purple-400 ml-2">
              ${state.timeDisplay.percentage.toFixed(1)}%
            </span>
          </div>
          <div>
            <span class="text-gray-400">Phase:</span>
            <span class="font-mono font-bold ${this.getPhaseColor(state.phase)} ml-2">
              ${state.phase.toUpperCase()}
            </span>
          </div>
        </div>
      </div>
    `;
  }

  attachEventListeners() {
    // Timer controls
    const startBtn = document.getElementById('timer-start');
    const pauseBtn = document.getElementById('timer-pause');
    const resumeBtn = document.getElementById('timer-resume');
    const resetBtn = document.getElementById('timer-reset');

    if (startBtn) {
      startBtn.addEventListener('click', () => {
        this.timer.start();
        this.render(); // Re-render to update controls
      });
    }

    if (pauseBtn) {
      pauseBtn.addEventListener('click', () => {
        this.timer.pause();
        this.render();
      });
    }

    if (resumeBtn) {
      resumeBtn.addEventListener('click', () => {
        this.timer.resume();
        this.render();
      });
    }

    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        this.timer.reset();
        this.render();
      });
    }
  }

  // Animation methods
  updateDisplay(remaining) {
    const timeElement = document.getElementById('timer-display');
    const mainTimerElement = document.getElementById('main-timer');
    
    if (timeElement) {
      timeElement.textContent = this.formatTimeForDisplay(remaining);
    }
    
    if (mainTimerElement) {
      const timeDisplay = this.timer.getTimeDisplay();
      mainTimerElement.textContent = timeDisplay.formatted;
    }
    
    this.updateProgressRing(this.timer.getState());
  }

  updateProgressRing(state) {
    const progressBar = document.getElementById('timer-progress-bar');
    if (!progressBar) return;
    
    const radius = 120;
    const circumference = 2 * Math.PI * radius;
    const percentage = state.duration > 0 ? 
      ((state.duration - state.remaining) / state.duration) * 100 : 0;
    
    const offset = circumference - (percentage / 100) * circumference;
    
    progressBar.style.strokeDashoffset = offset;
    progressBar.className = `progress-bar ${this.getProgressClass(state)}`;
  }

  animateExtension(extension) {
    if (this.isAnimating) return;
    
    this.isAnimating = true;
    
    const mainTimer = document.getElementById('main-timer');
    if (mainTimer) {
      mainTimer.style.animation = `timer-extend ${this.animations.extendDuration}ms ease-out`;
      
      setTimeout(() => {
        mainTimer.style.animation = '';
        this.isAnimating = false;
      }, this.animations.extendDuration);
    }
    
    // Show floating notification
    this.showFloatingNotification(`+${extension.minutes} minutes`, 'success');
  }

  enterWarningMode() {
    this.logger.info('Timer UI entering warning mode');
    this.updateStateClasses('warning');
  }

  enterCriticalMode() {
    this.logger.info('Timer UI entering critical mode');
    this.updateStateClasses('critical');
    this.showFloatingNotification('Time running out!', 'warning');
  }

  showTimeUpAnimation() {
    this.logger.info('Showing time up animation');
    
    const container = this.container;
    container.classList.add('animate-pulse');
    
    this.showFloatingNotification('Time is up!', 'error');
    
    setTimeout(() => {
      container.classList.remove('animate-pulse');
    }, 3000);
  }

  updateStateDisplay(state) {
    const statusElement = document.getElementById('timer-status');
    if (statusElement) {
      statusElement.textContent = this.getStatusMessage(state);
      statusElement.className = `status ${this.getStatusClass(state)}`;
    }
    
    this.updateStateClasses(state.phase);
  }

  updateStateClasses(phase) {
    const mainTimer = document.getElementById('main-timer');
    const progressBar = document.getElementById('timer-progress-bar');
    
    if (mainTimer) {
      mainTimer.className = `time ${this.getTimeClass({ phase })}`;
    }
    
    if (progressBar) {
      progressBar.className = `progress-bar ${this.getProgressClass({ phase })}`;
    }
  }

  showFloatingNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `floating-notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: ${type === 'success' ? '#10b981' : type === 'warning' ? '#f59e0b' : '#ef4444'};
      color: white;
      padding: 12px 24px;
      border-radius: 8px;
      font-weight: bold;
      z-index: 1000;
      animation: fadeInOut 2s ease-out forwards;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.remove();
    }, 2000);
  }

  showExtensionNotification(data) {
    this.showFloatingNotification(
      `Timer extended by ${data.minutes} minutes!`,
      'success'
    );
  }

  // Utility methods
  formatTimeForDisplay(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  getTimeClass(state) {
    switch (state.phase) {
      case 'warning': return 'warning';
      case 'critical': return 'critical';
      default: return '';
    }
  }

  getStatusClass(state) {
    switch (state.phase) {
      case 'warning': return 'warning';
      case 'critical': return 'critical';
      default: return '';
    }
  }

  getProgressClass(state) {
    switch (state.phase) {
      case 'warning': return 'warning';
      case 'critical': return 'critical';
      default: return '';
    }
  }

  getStatusLabel(state) {
    switch (state.phase) {
      case 'idle': return 'Ready';
      case 'running': return 'Active';
      case 'paused': return 'Paused';
      case 'warning': return 'Warning';
      case 'critical': return 'Critical';
      case 'ended': return 'Ended';
      default: return 'Unknown';
    }
  }

  getStatusMessage(state) {
    switch (state.phase) {
      case 'idle': return 'Ready to start';
      case 'running': return 'Time remaining';
      case 'paused': return 'Timer paused';
      case 'warning': return 'Time running low';
      case 'critical': return 'Time almost up!';
      case 'ended': return 'Time is up!';
      default: return '';
    }
  }

  getPhaseColor(phase) {
    switch (phase) {
      case 'running': return 'text-green-400';
      case 'paused': return 'text-yellow-400';
      case 'warning': return 'text-yellow-400';
      case 'critical': return 'text-red-400';
      case 'ended': return 'text-red-400';
      default: return 'text-gray-400';
    }
  }

  // Cleanup
  destroy() {
    this.logger.info('Destroying timer UI');
    
    // Remove any floating notifications
    document.querySelectorAll('.floating-notification').forEach(el => el.remove());
    
    // Clear container
    this.container.innerHTML = '';
  }
}