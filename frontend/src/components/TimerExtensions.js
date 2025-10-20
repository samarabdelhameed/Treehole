/**
 * Timer Extensions Manager
 * Handles timer extension requests, validation, and processing
 */

import { globalEventBus, EVENTS } from '../utils/eventBus.js';
import { logger } from '../utils/logger.js';

export class TimerExtensions {
  constructor(timerComponent, contractsManager) {
    this.timer = timerComponent;
    this.contracts = contractsManager;
    this.logger = logger.child('TimerExtensions');
    
    // Extension settings
    this.settings = {
      minExtension: 1, // minutes
      maxExtension: 60, // minutes
      maxTotalExtensions: 180, // minutes per session
      cooldownPeriod: 30000, // 30 seconds between extensions
      autoApprove: false
    };
    
    // State tracking
    this.lastExtensionTime = 0;
    this.pendingExtensions = new Map();
    this.extensionQueue = [];
    this.processedPayments = new Set(); // Track processed payments to prevent duplicates
    
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Ensure we don't add duplicate listeners
    if (this.listenersSetup) {
      return;
    }
    this.listenersSetup = true;
    
    // Listen for payment success to trigger extensions
    globalEventBus.on(EVENTS.PAYMENT_SUCCESS, (data) => {
      this.processPaymentExtension(data);
    });

    // Listen for manual extension requests
    globalEventBus.on('timer:requestExtension', (data) => {
      this.requestExtension(data);
    });

    // Listen for extension approvals/rejections
    globalEventBus.on('timer:approveExtension', (extensionId) => {
      this.approveExtension(extensionId);
    });

    globalEventBus.on('timer:rejectExtension', (extensionId) => {
      this.rejectExtension(extensionId);
    });
  }

  /**
   * Process extension from payment
   */
  async processPaymentExtension(paymentData) {
    try {
      this.logger.info('Processing payment extension', paymentData);
      
      // Check if we already processed this payment
      const paymentId = paymentData.txHash || paymentData.timestamp;
      if (this.processedPayments && this.processedPayments.has(paymentId)) {
        this.logger.debug('Payment extension already processed', { paymentId });
        return true;
      }
      
      // Initialize processed payments set if not exists
      if (!this.processedPayments) {
        this.processedPayments = new Set();
      }
      
      const extension = {
        id: Date.now() + Math.random(),
        minutes: paymentData.minutes || paymentData.extensionMinutes,
        source: 'payment',
        paymentData,
        timestamp: Date.now(),
        status: 'processing'
      };

      // Validate extension
      const validation = this.validateExtension(extension);
      if (!validation.valid) {
        this.logger.warn('Payment extension validation failed', validation);
        globalEventBus.emit('timer:extensionFailed', {
          extension,
          reason: validation.reason
        });
        return false;
      }

      // Mark payment as processed
      this.processedPayments.add(paymentId);
      
      // Auto-approve payment extensions
      extension.status = 'approved';
      this.executeExtension(extension);
      
      return true;
      
    } catch (error) {
      this.logger.error('Error processing payment extension', error);
      return false;
    }
  }

  /**
   * Request manual extension
   */
  async requestExtension(data) {
    try {
      const extension = {
        id: Date.now() + Math.random(),
        minutes: data.minutes,
        source: data.source || 'manual',
        requester: data.requester,
        timestamp: Date.now(),
        status: 'pending'
      };

      this.logger.info('Extension requested', extension);

      // Validate extension
      const validation = this.validateExtension(extension);
      if (!validation.valid) {
        this.logger.warn('Extension request validation failed', validation);
        globalEventBus.emit('timer:extensionFailed', {
          extension,
          reason: validation.reason
        });
        return false;
      }

      // Add to pending extensions
      this.pendingExtensions.set(extension.id, extension);

      // Auto-approve if enabled, otherwise request approval
      if (this.settings.autoApprove) {
        this.approveExtension(extension.id);
      } else {
        globalEventBus.emit('timer:extensionRequested', extension);
      }

      return extension.id;
      
    } catch (error) {
      this.logger.error('Error requesting extension', error);
      return false;
    }
  }

  /**
   * Validate extension request
   */
  validateExtension(extension) {
    // Check minimum extension
    if (extension.minutes < this.settings.minExtension) {
      return {
        valid: false,
        reason: `Minimum extension is ${this.settings.minExtension} minutes`
      };
    }

    // Check maximum extension
    if (extension.minutes > this.settings.maxExtension) {
      return {
        valid: false,
        reason: `Maximum extension is ${this.settings.maxExtension} minutes`
      };
    }

    // Check total extensions limit
    const currentTotal = this.timer.getTotalExtensionTime();
    if (currentTotal + extension.minutes > this.settings.maxTotalExtensions) {
      return {
        valid: false,
        reason: `Maximum total extensions (${this.settings.maxTotalExtensions} minutes) would be exceeded`
      };
    }

    // Check cooldown period
    const timeSinceLastExtension = Date.now() - this.lastExtensionTime;
    if (timeSinceLastExtension < this.settings.cooldownPeriod) {
      const remainingCooldown = Math.ceil((this.settings.cooldownPeriod - timeSinceLastExtension) / 1000);
      return {
        valid: false,
        reason: `Please wait ${remainingCooldown} seconds before requesting another extension`
      };
    }

    // Check if timer is in valid state for extension
    const timerState = this.timer.getState();
    if (timerState.phase === 'ended') {
      return {
        valid: false,
        reason: 'Cannot extend timer after it has ended'
      };
    }

    return { valid: true };
  }

  /**
   * Approve extension
   */
  approveExtension(extensionId) {
    const extension = this.pendingExtensions.get(extensionId);
    if (!extension) {
      this.logger.warn('Extension not found for approval', { extensionId });
      return false;
    }

    this.logger.info('Extension approved', extension);
    
    extension.status = 'approved';
    extension.approvedAt = Date.now();
    
    this.executeExtension(extension);
    this.pendingExtensions.delete(extensionId);
    
    return true;
  }

  /**
   * Reject extension
   */
  rejectExtension(extensionId, reason = 'Rejected by user') {
    const extension = this.pendingExtensions.get(extensionId);
    if (!extension) {
      this.logger.warn('Extension not found for rejection', { extensionId });
      return false;
    }

    this.logger.info('Extension rejected', { extension, reason });
    
    extension.status = 'rejected';
    extension.rejectedAt = Date.now();
    extension.rejectionReason = reason;
    
    globalEventBus.emit('timer:extensionRejected', extension);
    this.pendingExtensions.delete(extensionId);
    
    return true;
  }

  /**
   * Execute approved extension
   */
  executeExtension(extension) {
    try {
      this.logger.info('Executing extension', extension);
      
      // Extend the timer
      const result = this.timer.extend(extension.minutes, extension.source);
      
      if (result) {
        extension.status = 'completed';
        extension.completedAt = Date.now();
        extension.timerExtension = result;
        
        this.lastExtensionTime = Date.now();
        
        // Emit TIMER_EXTENDED for payment extensions since Timer.extend() doesn't
        if (extension.source === 'payment') {
          globalEventBus.emit(EVENTS.TIMER_EXTENDED, {
            minutes: extension.minutes,
            source: extension.source,
            extension: result,
            state: this.timer.getState()
          });
        }
        
        globalEventBus.emit('timer:extensionCompleted', extension);
        
        this.logger.info('Extension completed successfully', extension);
        return true;
      } else {
        extension.status = 'failed';
        extension.failedAt = Date.now();
        extension.failureReason = 'Timer extension failed';
        
        globalEventBus.emit('timer:extensionFailed', extension);
        return false;
      }
      
    } catch (error) {
      this.logger.error('Error executing extension', error);
      
      extension.status = 'failed';
      extension.failedAt = Date.now();
      extension.failureReason = error.message;
      
      globalEventBus.emit('timer:extensionFailed', extension);
      return false;
    }
  }

  /**
   * Get pending extensions
   */
  getPendingExtensions() {
    return Array.from(this.pendingExtensions.values());
  }

  /**
   * Get extension history
   */
  getExtensionHistory() {
    return this.timer.getExtensions();
  }

  /**
   * Calculate extension cost
   */
  calculateExtensionCost(minutes) {
    // This would typically come from the contract or configuration
    const ratePerMinute = 1.0; // 1 token per minute
    return minutes * ratePerMinute;
  }

  /**
   * Check if extension is allowed
   */
  canExtend(minutes = 1) {
    const validation = this.validateExtension({
      minutes,
      source: 'check',
      timestamp: Date.now()
    });
    
    return validation.valid;
  }

  /**
   * Get extension limits info
   */
  getExtensionLimits() {
    const currentTotal = this.timer.getTotalExtensionTime();
    const timeSinceLastExtension = Date.now() - this.lastExtensionTime;
    const cooldownRemaining = Math.max(0, this.settings.cooldownPeriod - timeSinceLastExtension);
    
    return {
      minExtension: this.settings.minExtension,
      maxExtension: this.settings.maxExtension,
      maxTotalExtensions: this.settings.maxTotalExtensions,
      currentTotalExtensions: currentTotal,
      remainingExtensions: this.settings.maxTotalExtensions - currentTotal,
      cooldownPeriod: this.settings.cooldownPeriod,
      cooldownRemaining: Math.ceil(cooldownRemaining / 1000),
      canExtend: this.canExtend()
    };
  }

  /**
   * Update settings
   */
  updateSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
    this.logger.info('Extension settings updated', this.settings);
    
    globalEventBus.emit('timer:extensionSettingsUpdated', this.settings);
  }

  /**
   * Clear all pending extensions
   */
  clearPendingExtensions() {
    const count = this.pendingExtensions.size;
    this.pendingExtensions.clear();
    
    this.logger.info('Cleared pending extensions', { count });
    globalEventBus.emit('timer:pendingExtensionsCleared', { count });
  }

  /**
   * Get statistics
   */
  getStatistics() {
    const extensions = this.getExtensionHistory();
    const paymentExtensions = extensions.filter(ext => ext.source === 'payment');
    const manualExtensions = extensions.filter(ext => ext.source === 'manual');
    
    return {
      totalExtensions: extensions.length,
      totalMinutesExtended: extensions.reduce((sum, ext) => sum + ext.minutes, 0),
      paymentExtensions: paymentExtensions.length,
      manualExtensions: manualExtensions.length,
      averageExtension: extensions.length > 0 ? 
        extensions.reduce((sum, ext) => sum + ext.minutes, 0) / extensions.length : 0,
      pendingCount: this.pendingExtensions.size,
      lastExtensionTime: this.lastExtensionTime
    };
  }

  /**
   * Cleanup
   */
  destroy() {
    this.logger.info('Destroying timer extensions manager');
    
    this.clearPendingExtensions();
    this.extensionQueue = [];
    this.processedPayments.clear();
    this.lastExtensionTime = 0;
  }
}