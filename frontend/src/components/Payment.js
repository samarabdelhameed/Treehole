import { globalEventBus, EVENTS } from '../utils/eventBus.js';
import { logger } from '../utils/logger.js';

export class PaymentComponent {
  constructor(contractsManager = null) {
    this.contractsManager = contractsManager;
    this.logger = logger.child('PaymentComponent');
    
    // Payment configuration
    this.config = {
      costPerMinute: 1.0, // 1 token per minute
      minExtension: 1, // minimum minutes
      maxExtension: 60, // maximum minutes
      confirmationTimeout: 30000, // 30 seconds
      retryAttempts: 3,
      retryDelay: 2000
    };
    
    // State tracking
    this.state = {
      isProcessing: false,
      currentPayment: null,
      paymentHistory: [],
      retryCount: 0
    };
    
    // Callbacks (legacy support)
    this.callbacks = {
      onPaymentSuccess: [],
      onPaymentError: [],
      onPaymentProgress: [],
      onPaymentConfirmation: [],
      onPaymentCancelled: []
    };
    
    this.setupEventListeners();
  }

  setContractsManager(contractsManager) {
    this.contractsManager = contractsManager;
  }

  calculateCost(minutes) {
    return (this.costPerMinute * minutes).toFixed(2);
  }

  async executePayment(listenerAddress, extensionMinutes, options = {}) {
    if (this.state.isProcessing) {
      throw new Error('Payment already in progress');
    }

    if (!this.contractsManager) {
      throw new Error('Contracts manager not initialized');
    }

    try {
      this.logger.info('Starting payment execution', { listenerAddress, extensionMinutes });
      
      // Validate inputs
      const validation = this.validatePaymentInputs(listenerAddress, extensionMinutes);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      const totalCost = this.calculateCost(extensionMinutes);
      
      // Create payment object
      const payment = {
        id: Date.now() + Math.random(),
        listenerAddress,
        extensionMinutes,
        totalCost,
        timestamp: Date.now(),
        status: 'pending',
        steps: []
      };
      
      this.state.currentPayment = payment;
      this.state.isProcessing = true;
      this.state.retryCount = 0;
      
      // Pre-flight checks
      await this.performPreflightChecks(payment);
      
      // Show confirmation dialog (unless skipped)
      if (!options.skipConfirmation) {
        const confirmed = await this.showPaymentConfirmation(payment);
        if (!confirmed) {
          this.handlePaymentCancellation(payment);
          return false;
        }
      }
      
      // Execute payment with retry logic
      const result = await this.executePaymentWithRetry(payment);
      
      this.handlePaymentSuccess(payment, result);
      return result;
      
    } catch (error) {
      this.handlePaymentError(payment || {}, error);
      throw error;
    } finally {
      this.state.isProcessing = false;
      this.state.currentPayment = null;
    }
  }

  async executePaymentWithRetry(payment) {
    let lastError;
    
    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        this.logger.info('Payment attempt', { attempt, paymentId: payment.id });
        
        // Step 1: Check and approve tokens if needed
        await this.handleTokenApproval(payment);
        
        // Step 2: Execute payment transaction
        const result = await this.executePaymentTransaction(payment);
        
        return result;
        
      } catch (error) {
        lastError = error;
        this.logger.warn('Payment attempt failed', { 
          attempt, 
          error: error.message,
          paymentId: payment.id 
        });
        
        // Don't retry on user cancellation or validation errors
        if (this.isNonRetryableError(error)) {
          throw error;
        }
        
        // Wait before retry (except on last attempt)
        if (attempt < this.config.retryAttempts) {
          await this.delay(this.config.retryDelay * attempt);
        }
      }
    }
    
    throw lastError;
  }

  async handleTokenApproval(payment) {
    this.updatePaymentProgress(payment, 'Checking token allowance...');
    
    // Check if approval is needed
    const needsApproval = await this.contractsManager.needsApproval(payment.totalCost);
    
    if (needsApproval) {
      this.updatePaymentProgress(payment, 'Approving tokens...');
      
      const approvalTx = await this.contractsManager.approveTokens(payment.totalCost);
      
      payment.steps.push({
        type: 'approval',
        txHash: approvalTx.hash,
        timestamp: Date.now(),
        status: 'completed'
      });
      
      this.logger.info('Token approval completed', { 
        txHash: approvalTx.hash,
        paymentId: payment.id 
      });
    } else {
      this.logger.info('Token approval not needed', { paymentId: payment.id });
    }
  }

  async executePaymentTransaction(payment) {
    this.updatePaymentProgress(payment, 'Processing payment...');
    
    const tx = await this.contractsManager.payAndSplit(
      payment.listenerAddress,
      payment.extensionMinutes,
      payment.totalCost
    );
    
    payment.steps.push({
      type: 'payment',
      txHash: tx.hash,
      timestamp: Date.now(),
      status: 'completed'
    });
    
    this.logger.info('Payment transaction completed', { 
      txHash: tx.hash,
      paymentId: payment.id 
    });
    
    return {
      txHash: tx.hash,
      amount: payment.totalCost,
      minutes: payment.extensionMinutes,
      listener: payment.listenerAddress,
      payment: payment
    };
  }

  async showPaymentConfirmation(listenerAddress, minutes, cost) {
    return new Promise((resolve) => {
      // Create modal dialog
      const modal = document.createElement('div');
      modal.className = 'modal-overlay';
      modal.innerHTML = `
        <div class="modal-content alarm-style">
          <div class="modal-header">
            <h3 class="text-2xl font-bold text-red-400 animate-pulse">⚠️ PAYMENT CONFIRMATION</h3>
          </div>
          
          <div class="modal-body space-y-4">
            <div class="payment-details glass-card p-4">
              <div class="detail-row">
                <span class="label">Amount:</span>
                <span class="value text-yellow-400 font-bold">${cost} THT</span>
              </div>
              <div class="detail-row">
                <span class="label">Extension:</span>
                <span class="value text-green-400 font-bold">${minutes} minutes</span>
              </div>
              <div class="detail-row">
                <span class="label">Listener:</span>
                <span class="value font-mono text-sm">${listenerAddress}</span>
              </div>
            </div>
            
            <div class="warning-box bg-red-500/20 border border-red-500/50 rounded-lg p-3">
              <p class="text-red-200 text-sm">
                This will execute 2 transactions:
              </p>
              <ol class="list-decimal list-inside text-sm text-gray-300 mt-2 space-y-1">
                <li>Approve tokens for spending</li>
                <li>Process payment and split</li>
              </ol>
            </div>
          </div>
          
          <div class="modal-actions flex gap-3 mt-6">
            <button id="cancel-payment" class="btn-secondary flex-1">Cancel</button>
            <button id="confirm-payment" class="btn-primary flex-1 animate-pulse">
              CONFIRM PAYMENT
            </button>
          </div>
        </div>
      `;

      document.body.appendChild(modal);

      // Add event listeners
      const cancelBtn = modal.querySelector('#cancel-payment');
      const confirmBtn = modal.querySelector('#confirm-payment');

      const cleanup = () => {
        document.body.removeChild(modal);
      };

      cancelBtn.addEventListener('click', () => {
        cleanup();
        resolve(false);
      });

      confirmBtn.addEventListener('click', () => {
        cleanup();
        resolve(true);
      });

      // Close on overlay click
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          cleanup();
          resolve(false);
        }
      });
    });
  }

  // Event callback methods
  onPaymentSuccess(callback) {
    this.callbacks.onPaymentSuccess.push(callback);
  }

  onPaymentError(callback) {
    this.callbacks.onPaymentError.push(callback);
  }

  onPaymentProgress(callback) {
    this.callbacks.onPaymentProgress.push(callback);
  }

  // Validation methods
  validatePaymentInputs(listenerAddress, extensionMinutes) {
    // Validate listener address
    if (!listenerAddress || typeof listenerAddress !== 'string') {
      return { valid: false, error: 'Invalid listener address' };
    }
    
    if (!listenerAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      return { valid: false, error: 'Invalid Ethereum address format' };
    }
    
    // Validate extension minutes
    if (!Number.isInteger(extensionMinutes) || extensionMinutes < this.config.minExtension) {
      return { valid: false, error: `Minimum extension is ${this.config.minExtension} minutes` };
    }
    
    if (extensionMinutes > this.config.maxExtension) {
      return { valid: false, error: `Maximum extension is ${this.config.maxExtension} minutes` };
    }
    
    return { valid: true };
  }

  async performPreflightChecks(payment) {
    this.updatePaymentProgress(payment, 'Performing pre-flight checks...');
    
    // Check wallet connection
    if (!this.contractsManager.signer) {
      throw new Error('Wallet not connected');
    }
    
    // Check contract deployment
    if (!this.contractsManager.areContractsDeployed()) {
      throw new Error('Contracts not deployed');
    }
    
    // Check token balance
    const balance = await this.contractsManager.getTokenBalance();
    const balanceNum = parseFloat(balance);
    const costNum = parseFloat(payment.totalCost);
    
    if (balanceNum < costNum) {
      throw new Error(`Insufficient token balance. Required: ${payment.totalCost} THT, Available: ${balance} THT`);
    }
    
    // Check ETH balance for gas
    const ethBalance = await this.contractsManager.signer.provider.getBalance(
      await this.contractsManager.signer.getAddress()
    );
    
    if (ethBalance === 0n) {
      throw new Error('Insufficient ETH for gas fees');
    }
    
    this.logger.info('Pre-flight checks passed', { paymentId: payment.id });
  }

  // Payment state management
  updatePaymentProgress(payment, message) {
    if (payment) {
      payment.status = 'processing';
      payment.lastUpdate = Date.now();
      payment.progressMessage = message;
    }
    
    this.triggerCallback('onPaymentProgress', message);
    globalEventBus.emit('payment:progress', { message, payment });
    
    this.logger.debug('Payment progress', { message, paymentId: payment?.id });
  }

  handlePaymentSuccess(payment, result) {
    payment.status = 'completed';
    payment.completedAt = Date.now();
    payment.result = result;
    
    // Add to history
    this.state.paymentHistory.push(payment);
    
    this.logger.info('Payment completed successfully', { 
      paymentId: payment.id,
      txHash: result.txHash || result.hash
    });
    
    // Prepare payment success data
    const successData = {
      listenerAddress: payment.listenerAddress,
      minutes: payment.extensionMinutes,
      extensionMinutes: payment.extensionMinutes,
      amount: payment.totalCost,
      txHash: result.txHash || result.hash,
      paymentId: payment.id
    };
    
    this.triggerCallback('onPaymentSuccess', successData);
    globalEventBus.emit(EVENTS.PAYMENT_SUCCESS, successData);
  }

  handlePaymentError(payment, error) {
    if (payment.id) {
      payment.status = 'failed';
      payment.failedAt = Date.now();
      payment.error = error.message;
      
      // Add to history
      this.state.paymentHistory.push(payment);
    }
    
    this.logger.error('Payment failed', { 
      paymentId: payment?.id,
      error: error.message 
    });
    
    this.triggerCallback('onPaymentError', error);
    globalEventBus.emit(EVENTS.PAYMENT_FAILED, { error: error.message, payment });
  }

  handlePaymentCancellation(payment) {
    payment.status = 'cancelled';
    payment.cancelledAt = Date.now();
    
    this.logger.info('Payment cancelled by user', { paymentId: payment.id });
    
    this.triggerCallback('onPaymentCancelled', payment);
    globalEventBus.emit('payment:cancelled', payment);
    
    throw new Error('Payment cancelled by user');
  }

  // Enhanced confirmation dialog
  async showPaymentConfirmation(payment) {
    return new Promise((resolve) => {
      const modal = document.createElement('div');
      modal.className = 'modal-overlay';
      modal.innerHTML = this.generateConfirmationHTML(payment);

      document.body.appendChild(modal);

      // Setup timeout
      const timeout = setTimeout(() => {
        cleanup();
        resolve(false);
      }, this.config.confirmationTimeout);

      // Keyboard shortcuts
      const handleKeydown = (e) => {
        if (e.key === 'Escape') {
          cleanup();
          resolve(false);
        } else if (e.key === 'Enter') {
          cleanup();
          resolve(true);
        }
      };

      const cleanup = () => {
        clearTimeout(timeout);
        document.removeEventListener('keydown', handleKeydown);
        document.body.removeChild(modal);
      };

      // Event listeners
      const cancelBtn = modal.querySelector('#cancel-payment');
      const confirmBtn = modal.querySelector('#confirm-payment');

      cancelBtn.addEventListener('click', () => {
        cleanup();
        resolve(false);
      });

      confirmBtn.addEventListener('click', () => {
        cleanup();
        resolve(true);
      });

      // Close on overlay click
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          cleanup();
          resolve(false);
        }
      });

      document.addEventListener('keydown', handleKeydown);
    });
  }

  generateConfirmationHTML(payment) {
    const timeoutSeconds = Math.floor(this.config.confirmationTimeout / 1000);
    
    return `
      <div class="modal-content alarm-style animate-fadeIn">
        <div class="modal-header">
          <h3 class="text-2xl font-bold text-red-400 animate-pulse flex items-center gap-2">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            PAYMENT CONFIRMATION
          </h3>
          <p class="text-sm text-gray-400 mt-1">Auto-cancel in ${timeoutSeconds} seconds</p>
        </div>
        
        <div class="modal-body space-y-4">
          <div class="payment-details glass-card p-4">
            <div class="detail-row">
              <span class="label">Amount:</span>
              <span class="value text-yellow-400 font-bold text-xl">${payment.totalCost} THT</span>
            </div>
            <div class="detail-row">
              <span class="label">Extension:</span>
              <span class="value text-green-400 font-bold text-xl">${payment.extensionMinutes} minutes</span>
            </div>
            <div class="detail-row">
              <span class="label">Rate:</span>
              <span class="value text-blue-400">${this.config.costPerMinute} THT/minute</span>
            </div>
            <div class="detail-row">
              <span class="label">Listener:</span>
              <span class="value font-mono text-sm break-all">${payment.listenerAddress}</span>
            </div>
          </div>
          
          <div class="warning-box">
            <div class="flex items-start gap-3">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-yellow-400 mt-0.5 flex-shrink-0">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              <div>
                <p class="text-yellow-200 text-sm font-semibold mb-2">
                  This will execute up to 2 transactions:
                </p>
                <ol class="list-decimal list-inside text-sm text-gray-300 space-y-1">
                  <li>Approve tokens for spending (if needed)</li>
                  <li>Process payment and split to listener/treasury</li>
                </ol>
              </div>
            </div>
          </div>

          <div class="bg-blue-500/20 border border-blue-500/50 rounded-lg p-3">
            <div class="flex items-center gap-2 text-blue-200 text-sm">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 6v6l4 2"/>
              </svg>
              <span>Timer will be extended immediately upon payment confirmation</span>
            </div>
          </div>
        </div>
        
        <div class="modal-actions">
          <button id="cancel-payment" class="btn-secondary flex-1">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
            Cancel (Esc)
          </button>
          <button id="confirm-payment" class="btn-primary flex-1 animate-pulse">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="20,6 9,17 4,12"/>
            </svg>
            CONFIRM PAYMENT (Enter)
          </button>
        </div>
      </div>
    `;
  }

  // Utility methods
  calculateCost(minutes) {
    return (this.config.costPerMinute * minutes).toFixed(1);
  }

  isNonRetryableError(error) {
    const nonRetryableMessages = [
      'cancelled by user',
      'insufficient',
      'invalid',
      'not allowed',
      'denied'
    ];
    
    return nonRetryableMessages.some(msg => 
      error.message.toLowerCase().includes(msg)
    );
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Event listeners setup
  setupEventListeners() {
    // Listen for payment requests from other components
    globalEventBus.on('payment:request', (data) => {
      this.executePayment(data.listenerAddress, data.extensionMinutes, data.options);
    });
  }

  // State and history management
  getPaymentHistory() {
    return [...this.state.paymentHistory];
  }

  getCurrentPayment() {
    return this.state.currentPayment;
  }

  isProcessing() {
    return this.state.isProcessing;
  }

  clearHistory() {
    this.state.paymentHistory = [];
    this.logger.info('Payment history cleared');
  }

  getStatistics() {
    const history = this.state.paymentHistory;
    const completed = history.filter(p => p.status === 'completed');
    const failed = history.filter(p => p.status === 'failed');
    const cancelled = history.filter(p => p.status === 'cancelled');
    
    return {
      total: history.length,
      completed: completed.length,
      failed: failed.length,
      cancelled: cancelled.length,
      totalAmount: completed.reduce((sum, p) => sum + parseFloat(p.totalCost), 0),
      totalMinutes: completed.reduce((sum, p) => sum + p.extensionMinutes, 0),
      successRate: history.length > 0 ? (completed.length / history.length) * 100 : 0
    };
  }

  // Configuration management
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    this.logger.info('Payment configuration updated', this.config);
  }

  getConfig() {
    return { ...this.config };
  }

  // Cleanup
  destroy() {
    this.logger.info('Destroying payment component');
    
    // Cancel any ongoing payment
    if (this.state.isProcessing) {
      this.state.isProcessing = false;
      this.state.currentPayment = null;
    }
    
    // Clear callbacks
    this.callbacks = {
      onPaymentSuccess: [],
      onPaymentError: [],
      onPaymentProgress: [],
      onPaymentConfirmation: [],
      onPaymentCancelled: []
    };
  }

  // Legacy callback methods
  triggerCallback(eventName, ...args) {
    if (this.callbacks[eventName]) {
      this.callbacks[eventName].forEach(callback => {
        try {
          callback(...args);
        } catch (error) {
          this.logger.error(`Payment callback error (${eventName})`, error);
        }
      });
    }
  }
}