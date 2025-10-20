export function minutesToSeconds(minutes) {
  return minutes * 60;
}

export function secondsToMinutes(seconds) {
  return Math.floor(seconds / 60);
}

export function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return {
    minutes: mins.toString().padStart(2, '0'),
    seconds: secs.toString().padStart(2, '0'),
    display: `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  };
}

export function formatDuration(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${remainingSeconds}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`;
  } else {
    return `${remainingSeconds}s`;
  }
}

export function generateRandomDuration(minMinutes = 5, maxMinutes = 15) {
  const randomMinutes = Math.floor(Math.random() * (maxMinutes - minMinutes + 1)) + minMinutes;
  return randomMinutes * 60; // Return in seconds
}

export function isTimeUp(seconds) {
  return seconds <= 0;
}

export function getTimeWarningThreshold(totalSeconds, warningPercentage = 0.1) {
  return Math.floor(totalSeconds * warningPercentage);
}

export function formatTimestamp(timestamp) {
  const date = new Date(timestamp);
  return {
    date: date.toLocaleDateString(),
    time: date.toLocaleTimeString(),
    full: date.toLocaleString(),
    iso: date.toISOString()
  };
}

export function getRelativeTime(timestamp) {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days} day${days > 1 ? 's' : ''} ago`;
  } else if (hours > 0) {
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  } else if (minutes > 0) {
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  } else {
    return 'Just now';
  }
}

export class Timer {
  constructor(initialSeconds = 0) {
    this.initialSeconds = initialSeconds;
    this.currentSeconds = initialSeconds;
    this.isRunning = false;
    this.intervalId = null;
    this.callbacks = {
      onTick: [],
      onComplete: [],
      onStart: [],
      onPause: [],
      onReset: []
    };
  }

  start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.triggerCallbacks('onStart');
    
    this.intervalId = setInterval(() => {
      if (this.currentSeconds > 0) {
        this.currentSeconds--;
        this.triggerCallbacks('onTick', this.currentSeconds);
      } else {
        this.complete();
      }
    }, 1000);
  }

  pause() {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.triggerCallbacks('onPause');
  }

  reset(newSeconds = null) {
    this.pause();
    this.currentSeconds = newSeconds !== null ? newSeconds : this.initialSeconds;
    this.triggerCallbacks('onReset', this.currentSeconds);
  }

  complete() {
    this.pause();
    this.triggerCallbacks('onComplete');
  }

  extend(seconds) {
    this.currentSeconds += seconds;
    this.triggerCallbacks('onTick', this.currentSeconds);
  }

  setTime(seconds) {
    this.currentSeconds = seconds;
    this.initialSeconds = seconds;
  }

  getTime() {
    return this.currentSeconds;
  }

  getFormattedTime() {
    return formatTime(this.currentSeconds);
  }

  isActive() {
    return this.isRunning;
  }

  // Event handling
  on(event, callback) {
    if (this.callbacks[event]) {
      this.callbacks[event].push(callback);
    }
  }

  off(event, callback) {
    if (this.callbacks[event]) {
      const index = this.callbacks[event].indexOf(callback);
      if (index > -1) {
        this.callbacks[event].splice(index, 1);
      }
    }
  }

  triggerCallbacks(event, ...args) {
    if (this.callbacks[event]) {
      this.callbacks[event].forEach(callback => {
        try {
          callback(...args);
        } catch (error) {
          console.error(`Timer callback error (${event}):`, error);
        }
      });
    }
  }
}