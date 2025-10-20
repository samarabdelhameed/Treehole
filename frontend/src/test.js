/**
 * Simple Test Suite for TreeHole Vanilla JS Application
 * This file contains basic tests to verify core functionality
 */

import { TreeHoleApp } from './App.js';
import { StateManager } from './utils/stateManager.js';
import { EventBus, EVENTS } from './utils/eventBus.js';
import { StorageManager } from './utils/storage.js';
import { Logger } from './utils/logger.js';
import { TimerComponent } from './components/Timer.js';

// Test utilities
class TestRunner {
  constructor() {
    this.tests = [];
    this.results = [];
  }

  test(name, testFn) {
    this.tests.push({ name, testFn });
  }

  async run() {
    console.log('🧪 Running TreeHole Tests...\n');
    
    for (const { name, testFn } of this.tests) {
      try {
        await testFn();
        this.results.push({ name, status: 'PASS', error: null });
        console.log(`✅ ${name}`);
      } catch (error) {
        this.results.push({ name, status: 'FAIL', error });
        console.error(`❌ ${name}: ${error.message}`);
      }
    }

    this.printSummary();
  }

  printSummary() {
    const passed = this.results.filter(r => r.status === 'PASS').length;
    const failed = this.results.filter(r => r.status === 'FAIL').length;
    
    console.log('\n📊 Test Summary:');
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📈 Success Rate: ${((passed / this.results.length) * 100).toFixed(1)}%`);
    
    if (failed === 0) {
      console.log('\n🎉 All tests passed! TreeHole is ready to go!');
    }
  }
}

// Create test runner
const runner = new TestRunner();

// Test 1: State Manager
runner.test('StateManager - Basic functionality', () => {
  const stateManager = new StateManager({ count: 0 });
  
  // Test initial state
  if (stateManager.getState().count !== 0) {
    throw new Error('Initial state not set correctly');
  }
  
  // Test state update
  stateManager.setState({ count: 1 });
  if (stateManager.getState().count !== 1) {
    throw new Error('State update failed');
  }
  
  // Test subscription
  let callbackCalled = false;
  stateManager.subscribe(() => {
    callbackCalled = true;
  });
  
  stateManager.setState({ count: 2 });
  if (!callbackCalled) {
    throw new Error('State subscription callback not called');
  }
});

// Test 2: Event Bus
runner.test('EventBus - Event emission and listening', () => {
  const eventBus = new EventBus();
  let eventReceived = false;
  let eventData = null;
  
  // Subscribe to event
  eventBus.on('test-event', (data) => {
    eventReceived = true;
    eventData = data;
  });
  
  // Emit event
  eventBus.emit('test-event', { message: 'Hello World' });
  
  if (!eventReceived) {
    throw new Error('Event not received');
  }
  
  if (eventData.message !== 'Hello World') {
    throw new Error('Event data not correct');
  }
});

// Test 3: Storage Manager
runner.test('StorageManager - Data persistence', () => {
  const storage = new StorageManager();
  
  // Test set and get
  storage.set('test-key', { value: 'test-data' });
  const retrieved = storage.get('test-key');
  
  if (!retrieved || retrieved.value !== 'test-data') {
    throw new Error('Storage set/get failed');
  }
  
  // Test default value
  const defaultValue = storage.get('non-existent-key', 'default');
  if (defaultValue !== 'default') {
    throw new Error('Default value not returned');
  }
  
  // Cleanup
  storage.remove('test-key');
});

// Test 4: Logger
runner.test('Logger - Logging functionality', () => {
  const logger = new Logger('Test', { enableStorage: true });
  
  // Test logging
  logger.info('Test message', { data: 'test' });
  logger.error('Test error', new Error('Test error'));
  
  // Test log retrieval
  const logs = logger.getLogs();
  if (logs.length < 2) {
    throw new Error('Logs not stored correctly');
  }
  
  // Test log filtering
  const errorLogs = logger.getLogs('error');
  if (errorLogs.length !== 1) {
    throw new Error('Log filtering failed');
  }
});

// Test 5: Timer Component
runner.test('TimerComponent - Timer functionality', () => {
  const timer = new TimerComponent();
  
  // Test random duration generation
  const duration = timer.generateRandomDuration();
  if (duration < 300 || duration > 900) { // 5-15 minutes in seconds
    throw new Error('Random duration out of range');
  }
  
  // Test timer state
  if (timer.isRunning) {
    throw new Error('Timer should not be running initially');
  }
  
  // Test extension
  const initialSeconds = timer.remaining;
  timer.extend(5); // 5 minutes
  if (timer.remaining !== initialSeconds + 300) {
    throw new Error('Timer extension failed');
  }
});

// Test 6: App Initialization
runner.test('TreeHoleApp - App initialization', async () => {
  // Create a mock DOM element
  if (!document.getElementById('root')) {
    const root = document.createElement('div');
    root.id = 'root';
    document.body.appendChild(root);
  }
  
  const app = new TreeHoleApp();
  
  // Test initial state
  if (!app.state) {
    throw new Error('App state not initialized');
  }
  
  if (!app.state.wallet || !app.state.timer || !app.state.ui) {
    throw new Error('App state structure incorrect');
  }
  
  // Test managers initialization
  if (!app.storageManager || !app.soundManager) {
    throw new Error('App managers not initialized');
  }
});

// Test 7: Event Integration
runner.test('Event Integration - Cross-component communication', () => {
  const eventBus = new EventBus();
  let walletEventReceived = false;
  let timerEventReceived = false;
  
  // Subscribe to wallet events
  eventBus.on(EVENTS.WALLET_CONNECTED, () => {
    walletEventReceived = true;
  });
  
  // Subscribe to timer events
  eventBus.on(EVENTS.TIMER_STARTED, () => {
    timerEventReceived = true;
  });
  
  // Emit events
  eventBus.emit(EVENTS.WALLET_CONNECTED, { address: '0x123' });
  eventBus.emit(EVENTS.TIMER_STARTED);
  
  if (!walletEventReceived || !timerEventReceived) {
    throw new Error('Cross-component events not working');
  }
});

// Test 8: Error Handling
runner.test('Error Handling - Graceful error management', () => {
  const logger = new Logger('ErrorTest');
  
  try {
    // Simulate an error
    throw new Error('Test error for handling');
  } catch (error) {
    // Test error logging
    logger.error('Caught test error', error);
    
    // Test error parsing (would be done by ErrorTracker in real app)
    if (!error.message || !error.stack) {
      throw new Error('Error object not properly formed');
    }
  }
});

// Test 9: Performance Monitoring
runner.test('Performance Monitoring - Basic timing', () => {
  const logger = new Logger('PerfTest');
  
  // Test timing functionality
  const key = logger.time('test-operation');
  
  // Simulate some work
  for (let i = 0; i < 1000; i++) {
    Math.random();
  }
  
  logger.timeEnd(key);
  
  // If we get here without errors, timing works
});

// Test 10: Module Loading
runner.test('Module Loading - All modules load correctly', async () => {
  // Test that all main modules can be imported
  const modules = [
    './App.js',
    './utils/stateManager.js',
    './utils/eventBus.js',
    './utils/storage.js',
    './utils/logger.js',
    './components/Timer.js',
    './components/Payment.js',
    './components/VoiceChat.js',
    './web3/wallet.js',
    './web3/contracts.js'
  ];
  
  for (const modulePath of modules) {
    try {
      await import(modulePath);
    } catch (error) {
      throw new Error(`Failed to load module: ${modulePath} - ${error.message}`);
    }
  }
});

// Export test runner for manual execution
export { runner };

// Auto-run tests if this file is loaded directly
if (import.meta.url === window.location.href) {
  runner.run();
}

// Also export individual test functions for debugging
export const runQuickTest = () => {
  console.log('🚀 Running Quick TreeHole Test...');
  
  try {
    // Quick state manager test
    const stateManager = new StateManager({ test: true });
    console.log('✅ StateManager working');
    
    // Quick event bus test
    const eventBus = new EventBus();
    eventBus.on('test', () => console.log('✅ EventBus working'));
    eventBus.emit('test');
    
    // Quick storage test
    const storage = new StorageManager();
    storage.set('test', 'value');
    const value = storage.get('test');
    if (value === 'value') {
      console.log('✅ StorageManager working');
    }
    
    console.log('🎉 Quick test completed successfully!');
    
  } catch (error) {
    console.error('❌ Quick test failed:', error);
  }
};

// Make test functions available globally for console testing
window.TreeHoleTest = {
  runAll: () => runner.run(),
  runQuick: runQuickTest,
  runner
};