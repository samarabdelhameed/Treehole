/**
 * Event Bus System for Component Communication
 * Implements pub/sub pattern for loose coupling between components
 */

export class EventBus {
  constructor() {
    this.events = new Map();
    this.debugMode = process.env.NODE_ENV === 'development';
    this.eventHistory = [];
    this.maxHistorySize = 100;
  }

  /**
   * Subscribe to an event
   * @param {string} eventName - Name of the event
   * @param {Function} callback - Callback function
   * @param {Object} options - Options (once, priority, context)
   * @returns {Function} Unsubscribe function
   */
  on(eventName, callback, options = {}) {
    if (!this.events.has(eventName)) {
      this.events.set(eventName, []);
    }

    const listener = {
      callback,
      once: options.once || false,
      priority: options.priority || 0,
      context: options.context || null,
      id: Date.now() + Math.random()
    };

    const listeners = this.events.get(eventName);
    listeners.push(listener);

    // Sort by priority (higher priority first)
    listeners.sort((a, b) => b.priority - a.priority);

    if (this.debugMode && this.shouldLogEventListener(eventName)) {
      console.log(`📡 Event listener added: ${eventName}`, { listener, totalListeners: listeners.length });
    }

    // Return unsubscribe function
    return () => this.off(eventName, listener.id);
  }

  /**
   * Subscribe to an event once
   * @param {string} eventName - Name of the event
   * @param {Function} callback - Callback function
   * @param {Object} options - Options
   * @returns {Function} Unsubscribe function
   */
  once(eventName, callback, options = {}) {
    return this.on(eventName, callback, { ...options, once: true });
  }

  /**
   * Unsubscribe from an event
   * @param {string} eventName - Name of the event
   * @param {string|Function} callbackOrId - Callback function or listener ID
   */
  off(eventName, callbackOrId) {
    if (!this.events.has(eventName)) return;

    const listeners = this.events.get(eventName);
    const index = listeners.findIndex(listener =>
      listener.id === callbackOrId || listener.callback === callbackOrId
    );

    if (index !== -1) {
      listeners.splice(index, 1);

      if (this.debugMode) {
        console.log(`📡 Event listener removed: ${eventName}`, { remainingListeners: listeners.length });
      }

      // Clean up empty event arrays
      if (listeners.length === 0) {
        this.events.delete(eventName);
      }
    }
  }

  /**
   * Emit an event
   * @param {string} eventName - Name of the event
   * @param {*} data - Data to pass to listeners
   * @param {Object} options - Emission options
   */
  emit(eventName, data = null, options = {}) {
    const startTime = performance.now();

    if (!this.events.has(eventName)) {
      // Only log missing listeners for important events to reduce noise
      const importantEvents = ['wallet:connected', 'payment:success', 'timer:ended'];
      if (this.debugMode && importantEvents.includes(eventName)) {
        console.log(`📡 No listeners for event: ${eventName}`);
      }
      return;
    }

    const listeners = [...this.events.get(eventName)]; // Copy to avoid mutation during iteration
    const results = [];
    let listenersExecuted = 0;

    for (const listener of listeners) {
      try {
        let result;

        if (listener.context) {
          result = listener.callback.call(listener.context, data, eventName);
        } else {
          result = listener.callback(data, eventName);
        }

        results.push(result);
        listenersExecuted++;

        // Remove one-time listeners
        if (listener.once) {
          this.off(eventName, listener.id);
        }

        // Stop propagation if requested
        if (options.stopPropagation && result === false) {
          break;
        }

      } catch (error) {
        console.error(`Error in event listener for '${eventName}':`, error);

        if (options.throwOnError) {
          throw error;
        }
      }
    }

    const endTime = performance.now();
    const duration = endTime - startTime;

    // Add to history
    this.addToHistory({
      eventName,
      data,
      timestamp: Date.now(),
      listenersExecuted,
      duration,
      results
    });

    if (this.debugMode) {
      // Reduce noise from frequent timer events
      const isTimerTick = eventName === 'timer:tick';
      const shouldLog = !isTimerTick || (isTimerTick && data % 30 === 0); // Only log every 30 seconds for timer ticks

      if (shouldLog) {
        console.log(`📡 Event emitted: ${eventName}`, {
          data,
          listenersExecuted,
          duration: `${duration.toFixed(2)}ms`,
          results
        });
      }
    }

    return results;
  }

  /**
   * Emit an event asynchronously
   * @param {string} eventName - Name of the event
   * @param {*} data - Data to pass to listeners
   * @param {Object} options - Emission options
   */
  async emitAsync(eventName, data = null, options = {}) {
    if (!this.events.has(eventName)) return [];

    const listeners = [...this.events.get(eventName)];
    const results = [];

    for (const listener of listeners) {
      try {
        let result;

        if (listener.context) {
          result = await listener.callback.call(listener.context, data, eventName);
        } else {
          result = await listener.callback(data, eventName);
        }

        results.push(result);

        if (listener.once) {
          this.off(eventName, listener.id);
        }

        if (options.stopPropagation && result === false) {
          break;
        }

      } catch (error) {
        console.error(`Error in async event listener for '${eventName}':`, error);

        if (options.throwOnError) {
          throw error;
        }
      }
    }

    return results;
  }

  /**
   * Get all event names
   */
  getEventNames() {
    return Array.from(this.events.keys());
  }

  /**
   * Get listener count for an event
   * @param {string} eventName - Name of the event
   */
  getListenerCount(eventName) {
    return this.events.has(eventName) ? this.events.get(eventName).length : 0;
  }

  /**
   * Remove all listeners for an event or all events
   * @param {string} eventName - Name of the event (optional)
   */
  removeAllListeners(eventName = null) {
    if (eventName) {
      this.events.delete(eventName);
      if (this.debugMode) {
        console.log(`📡 All listeners removed for event: ${eventName}`);
      }
    } else {
      this.events.clear();
      if (this.debugMode) {
        console.log('📡 All event listeners removed');
      }
    }
  }

  /**
   * Add event to history
   */
  addToHistory(eventData) {
    this.eventHistory.push(eventData);

    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }
  }

  /**
   * Get event history
   */
  getHistory() {
    return [...this.eventHistory];
  }

  /**
   * Clear event history
   */
  clearHistory() {
    this.eventHistory = [];
  }

  /**
   * Get debug information
   */
  getDebugInfo() {
    const info = {
      totalEvents: this.events.size,
      totalListeners: 0,
      events: {}
    };

    for (const [eventName, listeners] of this.events) {
      info.totalListeners += listeners.length;
      info.events[eventName] = {
        listenerCount: listeners.length,
        listeners: listeners.map(l => ({
          priority: l.priority,
          once: l.once,
          hasContext: !!l.context
        }))
      };
    }

    return info;
  }

  /**
   * Create a namespaced event bus
   * @param {string} namespace - Namespace prefix
   */
  createNamespace(namespace) {
    return {
      on: (eventName, callback, options) =>
        this.on(`${namespace}:${eventName}`, callback, options),

      once: (eventName, callback, options) =>
        this.once(`${namespace}:${eventName}`, callback, options),

      off: (eventName, callbackOrId) =>
        this.off(`${namespace}:${eventName}`, callbackOrId),

      emit: (eventName, data, options) =>
        this.emit(`${namespace}:${eventName}`, data, options),

      emitAsync: (eventName, data, options) =>
        this.emitAsync(`${namespace}:${eventName}`, data, options)
    };
  }

  /**
   * Determine if event listener should be logged
   * @param {string} eventName - Event name
   * @returns {boolean}
   */
  shouldLogEventListener(eventName) {
    // Only log important event listeners, skip common ones
    const skipEvents = [
      'wallet:accountChanged',
      'wallet:networkChanged',
      'timer:tick',
      'ui:update',
      'payment:failed',
      'voiceChat:connected',
      'voiceChat:disconnected',
      'contract:tokenBalanceUpdated',
      'ui:loadingStart',
      'ui:loadingEnd'
    ];

    return !skipEvents.includes(eventName);
  }
}

// Create global event bus instance
export const globalEventBus = new EventBus();

// Predefined event names for type safety
export const EVENTS = {
  // Wallet events
  WALLET_CONNECTED: 'wallet:connected',
  WALLET_DISCONNECTED: 'wallet:disconnected',
  WALLET_ACCOUNT_CHANGED: 'wallet:accountChanged',
  WALLET_NETWORK_CHANGED: 'wallet:networkChanged',

  // Timer events
  TIMER_STARTED: 'timer:started',
  TIMER_PAUSED: 'timer:paused',
  TIMER_RESET: 'timer:reset',
  TIMER_TICK: 'timer:tick',
  TIMER_ENDED: 'timer:ended',
  TIMER_EXTENDED: 'timer:extended',

  // Payment events
  PAYMENT_INITIATED: 'payment:initiated',
  PAYMENT_SUCCESS: 'payment:success',
  PAYMENT_FAILED: 'payment:failed',
  PAYMENT_APPROVED: 'payment:approved',

  // Voice chat events
  VOICE_CHAT_STARTED: 'voiceChat:started',
  VOICE_CHAT_ENDED: 'voiceChat:ended',
  VOICE_CHAT_CONNECTED: 'voiceChat:connected',
  VOICE_CHAT_DISCONNECTED: 'voiceChat:disconnected',
  VOICE_CHAT_MUTED: 'voiceChat:muted',
  VOICE_CHAT_UNMUTED: 'voiceChat:unmuted',

  // UI events
  UI_LOADING_START: 'ui:loadingStart',
  UI_LOADING_END: 'ui:loadingEnd',
  UI_TOAST_SHOW: 'ui:toastShow',
  UI_MODAL_OPEN: 'ui:modalOpen',
  UI_MODAL_CLOSE: 'ui:modalClose',

  // App events
  APP_INITIALIZED: 'app:initialized',
  APP_ERROR: 'app:error',
  APP_STATE_CHANGED: 'app:stateChanged',

  // Contract events
  CONTRACT_INITIALIZED: 'contract:initialized',
  CONTRACT_ERROR: 'contract:error',
  TOKEN_BALANCE_UPDATED: 'contract:tokenBalanceUpdated'
};

// Helper functions for common patterns
export const createEventEmitter = (namespace) => {
  return globalEventBus.createNamespace(namespace);
};

export const waitForEvent = (eventName, timeout = 5000) => {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      globalEventBus.off(eventName, handler);
      reject(new Error(`Event '${eventName}' timeout after ${timeout}ms`));
    }, timeout);

    const handler = (data) => {
      clearTimeout(timer);
      resolve(data);
    };

    globalEventBus.once(eventName, handler);
  });
};

export const debounceEvent = (eventName, delay = 300) => {
  let timeoutId;

  return (data) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      globalEventBus.emit(eventName, data);
    }, delay);
  };
};

export const throttleEvent = (eventName, limit = 100) => {
  let inThrottle;

  return (data) => {
    if (!inThrottle) {
      globalEventBus.emit(eventName, data);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};