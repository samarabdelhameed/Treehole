// Local storage utilities for payment history and user preferences
export interface PaymentRecord {
  id: string;
  timestamp: number;
  type: 'sent' | 'received';
  amount: string;
  extensionMinutes: number;
  counterparty: string;
  txHash: string;
  status: 'completed' | 'pending' | 'failed';
}

export interface UserPreferences {
  soundEnabled: boolean;
  defaultExtensionMinutes: number;
  theme: 'dark' | 'light';
  notifications: boolean;
  autoAcceptPayments: boolean;
}

class StorageManager {
  private static instance: StorageManager;
  private readonly PAYMENT_HISTORY_KEY = 'treehole_payment_history';
  private readonly USER_PREFERENCES_KEY = 'treehole_user_preferences';

  static getInstance(): StorageManager {
    if (!StorageManager.instance) {
      StorageManager.instance = new StorageManager();
    }
    return StorageManager.instance;
  }

  // Payment History Management
  addPaymentRecord(record: Omit<PaymentRecord, 'id' | 'timestamp'>): PaymentRecord {
    const fullRecord: PaymentRecord = {
      ...record,
      id: `payment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
    };

    const history = this.getPaymentHistory();
    history.unshift(fullRecord); // Add to beginning
    
    // Keep only last 100 records
    const trimmedHistory = history.slice(0, 100);
    
    localStorage.setItem(this.PAYMENT_HISTORY_KEY, JSON.stringify(trimmedHistory));
    return fullRecord;
  }

  getPaymentHistory(): PaymentRecord[] {
    try {
      const stored = localStorage.getItem(this.PAYMENT_HISTORY_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error loading payment history:', error);
      return [];
    }
  }

  updatePaymentStatus(id: string, status: PaymentRecord['status']) {
    const history = this.getPaymentHistory();
    const recordIndex = history.findIndex(record => record.id === id);
    
    if (recordIndex !== -1) {
      history[recordIndex].status = status;
      localStorage.setItem(this.PAYMENT_HISTORY_KEY, JSON.stringify(history));
    }
  }

  clearPaymentHistory() {
    localStorage.removeItem(this.PAYMENT_HISTORY_KEY);
  }

  // User Preferences Management
  getUserPreferences(): UserPreferences {
    try {
      const stored = localStorage.getItem(this.USER_PREFERENCES_KEY);
      const defaults: UserPreferences = {
        soundEnabled: true,
        defaultExtensionMinutes: 10,
        theme: 'dark',
        notifications: true,
        autoAcceptPayments: false,
      };
      
      return stored ? { ...defaults, ...JSON.parse(stored) } : defaults;
    } catch (error) {
      console.error('Error loading user preferences:', error);
      return {
        soundEnabled: true,
        defaultExtensionMinutes: 10,
        theme: 'dark',
        notifications: true,
        autoAcceptPayments: false,
      };
    }
  }

  updateUserPreferences(preferences: Partial<UserPreferences>) {
    const current = this.getUserPreferences();
    const updated = { ...current, ...preferences };
    localStorage.setItem(this.USER_PREFERENCES_KEY, JSON.stringify(updated));
    return updated;
  }

  // Analytics
  getPaymentStats() {
    const history = this.getPaymentHistory();
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    const weekMs = 7 * dayMs;
    const monthMs = 30 * dayMs;

    const stats = {
      total: {
        sent: 0,
        received: 0,
        amount: 0,
      },
      today: {
        sent: 0,
        received: 0,
        amount: 0,
      },
      week: {
        sent: 0,
        received: 0,
        amount: 0,
      },
      month: {
        sent: 0,
        received: 0,
        amount: 0,
      },
    };

    history.forEach(record => {
      if (record.status !== 'completed') return;

      const amount = parseFloat(record.amount);
      const age = now - record.timestamp;

      // Total stats
      if (record.type === 'sent') {
        stats.total.sent++;
      } else {
        stats.total.received++;
      }
      stats.total.amount += amount;

      // Time-based stats
      if (age <= dayMs) {
        if (record.type === 'sent') {
          stats.today.sent++;
        } else {
          stats.today.received++;
        }
        stats.today.amount += amount;
      }

      if (age <= weekMs) {
        if (record.type === 'sent') {
          stats.week.sent++;
        } else {
          stats.week.received++;
        }
        stats.week.amount += amount;
      }

      if (age <= monthMs) {
        if (record.type === 'sent') {
          stats.month.sent++;
        } else {
          stats.month.received++;
        }
        stats.month.amount += amount;
      }
    });

    return stats;
  }
}

export const storageManager = StorageManager.getInstance();