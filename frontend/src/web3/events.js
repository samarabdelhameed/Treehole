import { globalEventBus, EVENTS } from '../utils/eventBus.js';
import { logger } from '../utils/logger.js';

export class EventManager {
  constructor() {
    this.contractsManager = null;
    this.eventListeners = new Map();
    this.isListening = false;
    this.storageKey = 'treehole_events';
    this.logger = logger.child('EventManager');
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.eventHistory = [];
    this.maxHistorySize = 100;
    
    // Event filters and processing
    this.eventFilters = new Map();
    this.eventProcessors = new Map();
    
    // Cross-tab synchronization
    this.tabId = Date.now() + Math.random();
    this.lastEventTimestamp = 0;
    
    this.setupDefaultProcessors();
  }

  setContractsManager(contractsManager) {
    this.contractsManager = contractsManager;
  }

  async startListening() {
    if (!this.contractsManager || this.isListening) {
      this.logger.warn('Cannot start listening - already listening or no contracts manager');
      return;
    }

    try {
      this.logger.info('Starting event listening...');
      this.isListening = true;
      
      // Setup contract event listeners
      await this.setupContractListeners();
      
      // Listen for events from other tabs
      this.listenToTabs();
      
      // Start connection monitoring
      this.startConnectionMonitoring();

      this.logger.info('Event listening started successfully');
      globalEventBus.emit('eventManager:started');
      
    } catch (error) {
      this.logger.error('Failed to start event listening', error);
      this.isListening = false;
      throw error;
    }
  }

  async setupContractListeners() {
    if (!this.contractsManager) return;

    // Listen for PaymentProcessed events
    this.contractsManager.addEventListener('PaymentProcessed', (...args) => {
      this.handleContractEvent('PaymentProcessed', args);
    });

    // Listen for Transfer events (token transfers)
    this.contractsManager.addEventListener('Transfer', (...args) => {
      this.handleContractEvent('Transfer', args);
    }, { contract: this.contractsManager.testToken });

    // Listen for Approval events
    this.contractsManager.addEventListener('Approval', (...args) => {
      this.handleContractEvent('Approval', args);
    }, { contract: this.contractsManager.testToken });

    this.logger.debug('Contract event listeners setup complete');
  }

  stopListening() {
    if (this.contractsManager) {
      this.contractsManager.removeAllListeners();
    }
    
    window.removeEventListener('storage', this.handleStorageEvent);
    this.isListening = false;
    console.log('Event listening stopped');
  }

  handleContractEvent(eventType, args) {
    try {
      const processor = this.eventProcessors.get(eventType);
      if (!processor) {
        this.logger.warn('No processor found for event type', { eventType });
        return;
      }

      const eventData = processor(args);
      if (!eventData) return;

      // Add metadata
      eventData.id = Date.now() + Math.random();
      eventData.tabId = this.tabId;
      eventData.processed = Date.now();

      // Apply filters
      if (!this.passesFilters(eventData)) {
        this.logger.debug('Event filtered out', { eventType, eventData });
        return;
      }

      // Add to history
      this.addToHistory(eventData);

      // Handle the event
      this.handleEvent(eventData);

      // Broadcast to other tabs
      this.broadcastToTabs(eventData);

      this.logger.debug('Contract event processed', { eventType, eventData });

    } catch (error) {
      this.logger.error('Error handling contract event', { eventType, error });
    }
  }

  handleEvent(eventData) {
    // Trigger local callbacks
    const callbacks = this.eventListeners.get(eventData.type) || [];
    callbacks.forEach(callback => {
      try {
        callback(eventData);
      } catch (error) {
        this.logger.error('Event callback error', { eventType: eventData.type, error });
      }
    });

    // Emit to global event bus
    switch (eventData.type) {
      case 'PaymentProcessed':
        globalEventBus.emit(EVENTS.PAYMENT_SUCCESS, {
          listenerAddress: eventData.listener,
          minutes: eventData.extensionSeconds / 60,
          amount: eventData.amount,
          txHash: eventData.txHash
        });
        break;
      
      case 'Transfer':
        globalEventBus.emit(EVENTS.TOKEN_BALANCE_UPDATED, eventData);
        break;
        
      case 'Approval':
        globalEventBus.emit('token:approved', eventData);
        break;
    }
  }

  // Multi-tab synchronization using localStorage
  broadcastToTabs(eventData) {
    try {
      const existingEvents = this.getStoredEvents();
      existingEvents.push(eventData);
      
      // Keep only last 50 events to prevent storage bloat
      if (existingEvents.length > 50) {
        existingEvents.splice(0, existingEvents.length - 50);
      }
      
      localStorage.setItem(this.storageKey, JSON.stringify(existingEvents));
      
      // Trigger storage event for other tabs
      localStorage.setItem(`${this.storageKey}_trigger`, Date.now().toString());
    } catch (error) {
      console.error('Failed to broadcast event to tabs:', error);
    }
  }

  listenToTabs() {
    this.handleStorageEvent = (e) => {
      if (e.key === `${this.storageKey}_trigger`) {
        const events = this.getStoredEvents();
        const latestEvent = events[events.length - 1];
        
        if (latestEvent && latestEvent.timestamp > (Date.now() - 5000)) {
          // Process recent events from other tabs
          this.handlePaymentEvent(latestEvent);
        }
      }
    };

    window.addEventListener('storage', this.handleStorageEvent);
  }

  getStoredEvents() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to get stored events:', error);
      return [];
    }
  }

  // Event subscription methods
  onPaymentProcessed(callback) {
    if (!this.eventListeners.has('PaymentProcessed')) {
      this.eventListeners.set('PaymentProcessed', []);
    }
    this.eventListeners.get('PaymentProcessed').push(callback);
  }

  onTokenTransfer(callback) {
    if (!this.eventListeners.has('TokenTransfer')) {
      this.eventListeners.set('TokenTransfer', []);
    }
    this.eventListeners.get('TokenTransfer').push(callback);
  }

  // Remove event listeners
  removeListener(eventType, callback) {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  removeAllListeners(eventType = null) {
    if (eventType) {
      this.eventListeners.delete(eventType);
    } else {
      this.eventListeners.clear();
    }
  }

  // Connection monitoring
  async checkConnection() {
    try {
      if (!this.contractsManager) {
        return false;
      }

      // Try to get latest block to check connection
      const provider = this.contractsManager.signer?.provider;
      if (provider) {
        await provider.getBlockNumber();
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Connection check failed:', error);
      return false;
    }
  }

  async reconnect() {
    try {
      this.stopListening();
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
      await this.startListening();
      return true;
    } catch (error) {
      console.error('Reconnection failed:', error);
      return false;
    }
  }

  getConnectionStatus() {
    return {
      isListening: this.isListening,
      hasContracts: !!this.contractsManager,
      eventListenerCount: Array.from(this.eventListeners.values())
        .reduce((total, listeners) => total + listeners.length, 0),
      reconnectAttempts: this.reconnectAttempts,
      eventHistorySize: this.eventHistory.length,
      tabId: this.tabId
    };
  }

  // Setup default event processors
  setupDefaultProcessors() {
    // PaymentProcessed event processor
    this.eventProcessors.set('PaymentProcessed', (args) => {
      const [payer, listener, amount, extensionSeconds, event] = args;
      return {
        type: 'PaymentProcessed',
        payer,
        listener,
        amount: amount.toString(),
        extensionSeconds: extensionSeconds.toString(),
        extensionMinutes: Math.floor(extensionSeconds / 60),
        txHash: event?.log?.transactionHash || event?.transactionHash,
        blockNumber: event?.log?.blockNumber || event?.blockNumber,
        timestamp: Date.now()
      };
    });

    // Transfer event processor
    this.eventProcessors.set('Transfer', (args) => {
      const [from, to, amount, event] = args;
      return {
        type: 'Transfer',
        from,
        to,
        amount: amount.toString(),
        txHash: event?.log?.transactionHash || event?.transactionHash,
        blockNumber: event?.log?.blockNumber || event?.blockNumber,
        timestamp: Date.now()
      };
    });

    // Approval event processor
    this.eventProcessors.set('Approval', (args) => {
      const [owner, spender, amount, event] = args;
      return {
        type: 'Approval',
        owner,
        spender,
        amount: amount.toString(),
        txHash: event?.log?.transactionHash || event?.transactionHash,
        blockNumber: event?.log?.blockNumber || event?.blockNumber,
        timestamp: Date.now()
      };
    });
  }

  // Event filtering
  addFilter(eventType, filterFn) {
    if (!this.eventFilters.has(eventType)) {
      this.eventFilters.set(eventType, []);
    }
    this.eventFilters.get(eventType).push(filterFn);
  }

  removeFilter(eventType, filterFn) {
    const filters = this.eventFilters.get(eventType);
    if (filters) {
      const index = filters.indexOf(filterFn);
      if (index > -1) {
        filters.splice(index, 1);
      }
    }
  }

  passesFilters(eventData) {
    const filters = this.eventFilters.get(eventData.type) || [];
    return filters.every(filter => {
      try {
        return filter(eventData);
      } catch (error) {
        this.logger.error('Filter error', { eventType: eventData.type, error });
        return true; // Pass through on filter error
      }
    });
  }

  // Event history management
  addToHistory(eventData) {
    this.eventHistory.push(eventData);
    this.lastEventTimestamp = eventData.timestamp;
    
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }
  }

  getEventHistory(eventType = null, limit = null) {
    let history = [...this.eventHistory];
    
    if (eventType) {
      history = history.filter(event => event.type === eventType);
    }
    
    if (limit) {
      history = history.slice(-limit);
    }
    
    return history;
  }

  clearHistory() {
    this.eventHistory = [];
    this.lastEventTimestamp = 0;
  }

  // Connection monitoring
  startConnectionMonitoring() {
    this.connectionMonitor = setInterval(async () => {
      const isConnected = await this.checkConnection();
      if (!isConnected && this.isListening) {
        this.logger.warn('Connection lost, attempting to reconnect...');
        this.attemptReconnect();
      }
    }, 30000); // Check every 30 seconds
  }

  stopConnectionMonitoring() {
    if (this.connectionMonitor) {
      clearInterval(this.connectionMonitor);
      this.connectionMonitor = null;
    }
  }

  async attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.logger.error('Max reconnect attempts reached');
      globalEventBus.emit('eventManager:maxReconnectAttemptsReached');
      return false;
    }

    this.reconnectAttempts++;
    
    try {
      await this.reconnect();
      this.reconnectAttempts = 0; // Reset on success
      this.logger.info('Reconnection successful');
      globalEventBus.emit('eventManager:reconnected');
      return true;
    } catch (error) {
      this.logger.error('Reconnection failed', { 
        attempt: this.reconnectAttempts, 
        error 
      });
      
      // Exponential backoff
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
      setTimeout(() => this.attemptReconnect(), delay);
      return false;
    }
  }

  // Enhanced tab synchronization
  listenToTabs() {
    this.handleStorageEvent = (e) => {
      if (e.key === `${this.storageKey}_trigger`) {
        try {
          const triggerData = JSON.parse(e.newValue || '{}');
          if (triggerData.tabId !== this.tabId) {
            this.processCrossTabEvent(triggerData);
          }
        } catch (error) {
          this.logger.error('Error processing cross-tab event', error);
        }
      }
    };

    window.addEventListener('storage', this.handleStorageEvent);
    this.logger.debug('Cross-tab event listening started');
  }

  processCrossTabEvent(triggerData) {
    const events = this.getStoredEvents();
    const newEvents = events.filter(event => 
      event.timestamp > this.lastEventTimestamp &&
      event.tabId !== this.tabId
    );

    newEvents.forEach(event => {
      this.logger.debug('Processing cross-tab event', { event });
      this.handleEvent(event);
      this.addToHistory(event);
    });
  }

  broadcastToTabs(eventData) {
    try {
      const existingEvents = this.getStoredEvents();
      existingEvents.push(eventData);
      
      // Keep only recent events
      const cutoffTime = Date.now() - (5 * 60 * 1000); // 5 minutes
      const recentEvents = existingEvents.filter(event => 
        event.timestamp > cutoffTime
      );
      
      localStorage.setItem(this.storageKey, JSON.stringify(recentEvents));
      
      // Trigger storage event for other tabs
      localStorage.setItem(`${this.storageKey}_trigger`, JSON.stringify({
        timestamp: Date.now(),
        tabId: this.tabId,
        eventType: eventData.type
      }));
      
    } catch (error) {
      this.logger.error('Failed to broadcast event to tabs', error);
    }
  }

  // Enhanced cleanup
  cleanup() {
    this.logger.info('Cleaning up event manager');
    
    this.stopListening();
    this.stopConnectionMonitoring();
    this.eventListeners.clear();
    this.eventFilters.clear();
    this.clearHistory();
    
    if (this.contractsManager) {
      this.contractsManager.cleanup();
    }
  }

  // Debug and monitoring
  getDebugInfo() {
    return {
      isListening: this.isListening,
      tabId: this.tabId,
      eventListeners: Object.fromEntries(
        Array.from(this.eventListeners.entries()).map(([key, value]) => [key, value.length])
      ),
      eventFilters: Object.fromEntries(
        Array.from(this.eventFilters.entries()).map(([key, value]) => [key, value.length])
      ),
      eventHistory: this.eventHistory.length,
      reconnectAttempts: this.reconnectAttempts,
      lastEventTimestamp: this.lastEventTimestamp,
      connectionStatus: this.getConnectionStatus()
    };
  }
}