export class StorageManager {
  constructor() {
    this.storageKey = 'treehole_data';
    this.preferencesKey = 'treehole_preferences';
    this.paymentHistoryKey = 'treehole_payment_history';
  }

  init() {
    // Initialize default preferences if not exists
    if (!this.getUserPreferences()) {
      this.setUserPreferences({
        defaultExtensionMinutes: 10,
        autoAcceptPayments: false,
        soundEnabled: true,
        theme: 'dark'
      });
    }
  }

  // User preferences
  getUserPreferences() {
    try {
      const stored = localStorage.getItem(this.preferencesKey);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('Failed to get user preferences:', error);
      return null;
    }
  }

  setUserPreferences(preferences) {
    try {
      const existing = this.getUserPreferences() || {};
      const updated = { ...existing, ...preferences };
      localStorage.setItem(this.preferencesKey, JSON.stringify(updated));
      return updated;
    } catch (error) {
      console.error('Failed to set user preferences:', error);
      return null;
    }
  }

  // Payment history
  getPaymentHistory() {
    try {
      const stored = localStorage.getItem(this.paymentHistoryKey);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to get payment history:', error);
      return [];
    }
  }

  addPaymentRecord(payment) {
    try {
      const history = this.getPaymentHistory();
      const record = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        ...payment
      };
      
      history.unshift(record); // Add to beginning
      
      // Keep only last 100 records
      if (history.length > 100) {
        history.splice(100);
      }
      
      localStorage.setItem(this.paymentHistoryKey, JSON.stringify(history));
      return record;
    } catch (error) {
      console.error('Failed to add payment record:', error);
      return null;
    }
  }

  clearPaymentHistory() {
    try {
      localStorage.removeItem(this.paymentHistoryKey);
      return true;
    } catch (error) {
      console.error('Failed to clear payment history:', error);
      return false;
    }
  }

  // Session data
  getSessionData() {
    try {
      const stored = sessionStorage.getItem(this.storageKey);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error('Failed to get session data:', error);
      return {};
    }
  }

  setSessionData(data) {
    try {
      const existing = this.getSessionData();
      const updated = { ...existing, ...data };
      sessionStorage.setItem(this.storageKey, JSON.stringify(updated));
      return updated;
    } catch (error) {
      console.error('Failed to set session data:', error);
      return null;
    }
  }

  // State management integration
  saveState(state) {
    try {
      const stateKey = 'treehole_app_state';
      localStorage.setItem(stateKey, JSON.stringify({
        ...state,
        timestamp: Date.now()
      }));
      return true;
    } catch (error) {
      console.error('Failed to save app state:', error);
      return false;
    }
  }

  loadState() {
    try {
      const stateKey = 'treehole_app_state';
      const stored = localStorage.getItem(stateKey);
      if (stored) {
        const state = JSON.parse(stored);
        // Check if state is not too old (24 hours)
        const isValid = Date.now() - (state.timestamp || 0) < 24 * 60 * 60 * 1000;
        return isValid ? state : null;
      }
      return null;
    } catch (error) {
      console.error('Failed to load app state:', error);
      return null;
    }
  }

  clearState() {
    try {
      const stateKey = 'treehole_app_state';
      localStorage.removeItem(stateKey);
      return true;
    } catch (error) {
      console.error('Failed to clear app state:', error);
      return false;
    }
  }

  clearSessionData() {
    try {
      sessionStorage.removeItem(this.storageKey);
      return true;
    } catch (error) {
      console.error('Failed to clear session data:', error);
      return false;
    }
  }

  // Wallet connection state
  saveWalletState(walletState) {
    return this.setSessionData({ wallet: walletState });
  }

  getWalletState() {
    const sessionData = this.getSessionData();
    return sessionData.wallet || null;
  }

  // Timer state
  saveTimerState(timerState) {
    return this.setSessionData({ timer: timerState });
  }

  getTimerState() {
    const sessionData = this.getSessionData();
    return sessionData.timer || null;
  }

  // Voice chat state
  saveVoiceChatState(voiceChatState) {
    return this.setSessionData({ voiceChat: voiceChatState });
  }

  getVoiceChatState() {
    const sessionData = this.getSessionData();
    return sessionData.voiceChat || null;
  }

  // Utility methods
  exportData() {
    try {
      const data = {
        preferences: this.getUserPreferences(),
        paymentHistory: this.getPaymentHistory(),
        sessionData: this.getSessionData(),
        exportDate: new Date().toISOString()
      };
      
      return JSON.stringify(data, null, 2);
    } catch (error) {
      console.error('Failed to export data:', error);
      return null;
    }
  }

  importData(jsonData) {
    try {
      const data = JSON.parse(jsonData);
      
      if (data.preferences) {
        this.setUserPreferences(data.preferences);
      }
      
      if (data.paymentHistory) {
        localStorage.setItem(this.paymentHistoryKey, JSON.stringify(data.paymentHistory));
      }
      
      return true;
    } catch (error) {
      console.error('Failed to import data:', error);
      return false;
    }
  }

  clearAllData() {
    try {
      localStorage.removeItem(this.preferencesKey);
      localStorage.removeItem(this.paymentHistoryKey);
      sessionStorage.removeItem(this.storageKey);
      return true;
    } catch (error) {
      console.error('Failed to clear all data:', error);
      return false;
    }
  }

  // Storage event listener for cross-tab synchronization
  onStorageChange(callback) {
    const handleStorageChange = (e) => {
      if (e.key === this.preferencesKey || 
          e.key === this.paymentHistoryKey || 
          e.key === this.storageKey) {
        callback(e);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    // Return cleanup function
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }
}