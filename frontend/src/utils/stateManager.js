/**
 * Reactive State Management System
 * Provides centralized state management with reactivity and persistence
 */

export class StateManager {
  constructor(initialState = {}) {
    this.state = { ...initialState };
    this.listeners = new Map();
    this.middleware = [];
    this.history = [];
    this.maxHistorySize = 50;
    
    // Bind methods
    this.setState = this.setState.bind(this);
    this.getState = this.getState.bind(this);
    this.subscribe = this.subscribe.bind(this);
    this.unsubscribe = this.unsubscribe.bind(this);
  }

  /**
   * Get current state (immutable copy)
   */
  getState() {
    return JSON.parse(JSON.stringify(this.state));
  }

  /**
   * Update state with new values
   * @param {Object|Function} newState - New state object or updater function
   * @param {string} action - Action name for debugging
   */
  setState(newState, action = 'UPDATE_STATE') {
    const prevState = this.getState();
    
    // Handle function updates
    if (typeof newState === 'function') {
      newState = newState(prevState);
    }

    // Apply middleware
    let processedState = newState;
    for (const middleware of this.middleware) {
      processedState = middleware(processedState, prevState, action);
    }

    // Merge with existing state
    this.state = this.deepMerge(this.state, processedState);
    
    // Add to history
    this.addToHistory(prevState, this.state, action);
    
    // Notify listeners
    this.notifyListeners(this.state, prevState, action);
  }

  /**
   * Subscribe to state changes
   * @param {Function} listener - Callback function
   * @param {string|Array} paths - Specific paths to watch (optional)
   * @returns {Function} Unsubscribe function
   */
  subscribe(listener, paths = null) {
    const id = Date.now() + Math.random();
    this.listeners.set(id, { listener, paths });
    
    return () => this.unsubscribe(id);
  }

  /**
   * Unsubscribe from state changes
   * @param {string} id - Listener ID
   */
  unsubscribe(id) {
    this.listeners.delete(id);
  }

  /**
   * Add middleware for state processing
   * @param {Function} middleware - Middleware function
   */
  addMiddleware(middleware) {
    this.middleware.push(middleware);
  }

  /**
   * Get specific value from state using path
   * @param {string} path - Dot notation path (e.g., 'user.profile.name')
   */
  getValue(path) {
    return this.getNestedValue(this.state, path);
  }

  /**
   * Set specific value in state using path
   * @param {string} path - Dot notation path
   * @param {*} value - Value to set
   * @param {string} action - Action name
   */
  setValue(path, value, action = `SET_${path.toUpperCase()}`) {
    const newState = this.setNestedValue({}, path, value);
    this.setState(newState, action);
  }

  /**
   * Reset state to initial values
   * @param {Object} initialState - New initial state (optional)
   */
  reset(initialState = {}) {
    this.state = { ...initialState };
    this.history = [];
    this.notifyListeners(this.state, {}, 'RESET_STATE');
  }

  /**
   * Get state history
   */
  getHistory() {
    return [...this.history];
  }

  /**
   * Undo last state change
   */
  undo() {
    if (this.history.length > 1) {
      this.history.pop(); // Remove current state
      const prevState = this.history[this.history.length - 1];
      this.state = { ...prevState.state };
      this.notifyListeners(this.state, prevState.prevState, 'UNDO');
    }
  }

  // Private methods

  deepMerge(target, source) {
    const result = { ...target };
    
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(target[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    
    return result;
  }

  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  setNestedValue(obj, path, value) {
    const keys = path.split('.');
    const lastKey = keys.pop();
    const target = keys.reduce((current, key) => {
      current[key] = current[key] || {};
      return current[key];
    }, obj);
    
    target[lastKey] = value;
    return obj;
  }

  addToHistory(prevState, newState, action) {
    this.history.push({
      timestamp: Date.now(),
      action,
      prevState,
      state: newState
    });

    // Limit history size
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
    }
  }

  notifyListeners(newState, prevState, action) {
    for (const [id, { listener, paths }] of this.listeners) {
      try {
        // If specific paths are watched, check if they changed
        if (paths) {
          const pathsArray = Array.isArray(paths) ? paths : [paths];
          const hasChanges = pathsArray.some(path => {
            const oldValue = this.getNestedValue(prevState, path);
            const newValue = this.getNestedValue(newState, path);
            return JSON.stringify(oldValue) !== JSON.stringify(newValue);
          });

          if (hasChanges) {
            listener(newState, prevState, action);
          }
        } else {
          // No specific paths, notify of all changes
          listener(newState, prevState, action);
        }
      } catch (error) {
        console.error(`Error in state listener ${id}:`, error);
      }
    }
  }
}

/**
 * Middleware functions
 */

// Logging middleware
export const loggingMiddleware = (newState, prevState, action) => {
  // Only log important state changes to reduce noise
  const importantActions = ['WALLET_CONNECTED', 'PAYMENT_SUCCESS', 'TIMER_ENDED'];
  if (process.env.NODE_ENV === 'development' && importantActions.includes(action)) {
    console.group(`🔄 State Update: ${action}`);
    console.log('Previous State:', prevState);
    console.log('New State:', newState);
    console.log('Timestamp:', new Date().toISOString());
    console.groupEnd();
  }
  return newState;
};

// Validation middleware
export const validationMiddleware = (schema) => (newState, prevState, action) => {
  // Simple validation - in a real app you might use a library like Joi or Yup
  if (schema && typeof schema.validate === 'function') {
    const { error } = schema.validate(newState);
    if (error) {
      console.error('State validation error:', error);
      throw new Error(`Invalid state: ${error.message}`);
    }
  }
  return newState;
};

// Persistence middleware
export const persistenceMiddleware = (storage, key = 'app_state') => (newState, prevState, action) => {
  try {
    storage.setItem(key, JSON.stringify(newState));
  } catch (error) {
    console.error('Failed to persist state:', error);
  }
  return newState;
};

// Performance monitoring middleware
export const performanceMiddleware = (newState, prevState, action) => {
  const start = performance.now();
  
  // Use requestAnimationFrame for better performance
  requestAnimationFrame(() => {
    const end = performance.now();
    const duration = end - start;
    
    // Only warn for significantly slow updates (more than 100ms)
    if (duration > 100) {
      console.warn(`Slow state update detected: ${action} took ${duration.toFixed(2)}ms`);
    }
  });
  
  return newState;
};

/**
 * Create a configured state manager instance
 */
export function createStateManager(initialState = {}, options = {}) {
  const stateManager = new StateManager(initialState);
  
  // Add default middleware
  if (options.logging !== false) {
    stateManager.addMiddleware(loggingMiddleware);
  }
  
  if (options.performance !== false) {
    stateManager.addMiddleware(performanceMiddleware);
  }
  
  if (options.persistence) {
    const { storage = localStorage, key = 'app_state' } = options.persistence;
    stateManager.addMiddleware(persistenceMiddleware(storage, key));
  }
  
  if (options.validation) {
    stateManager.addMiddleware(validationMiddleware(options.validation));
  }
  
  return stateManager;
}