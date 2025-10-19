import { useState, useEffect } from 'react';
import { Settings, Volume2, VolumeX, Bell, BellOff, Palette } from 'lucide-react';
import Modal from './Modal';
import { storageManager, UserPreferences } from '../utils/storage';
import { soundManager } from '../utils/sounds';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsPanel({ isOpen, onClose }: SettingsPanelProps) {
  const [preferences, setPreferences] = useState<UserPreferences>(storageManager.getUserPreferences());

  useEffect(() => {
    if (isOpen) {
      setPreferences(storageManager.getUserPreferences());
    }
  }, [isOpen]);

  const updatePreference = <K extends keyof UserPreferences>(
    key: K,
    value: UserPreferences[K]
  ) => {
    const updated = storageManager.updateUserPreferences({ [key]: value });
    setPreferences(updated);

    // Apply changes immediately
    if (key === 'soundEnabled') {
      soundManager.toggle();
      if (value) {
        soundManager.playConnection();
      }
    }
  };

  const stats = storageManager.getPaymentStats();

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Settings & Stats">
      <div className="space-y-6">
        {/* Sound Settings */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Volume2 size={20} />
            Audio Settings
          </h3>
          
          <div className="flex items-center justify-between p-3 glass-card">
            <div className="flex items-center gap-3">
              {preferences.soundEnabled ? (
                <Volume2 size={20} className="text-green-400" />
              ) : (
                <VolumeX size={20} className="text-gray-400" />
              )}
              <span>Sound Effects</span>
            </div>
            <button
              onClick={() => updatePreference('soundEnabled', !preferences.soundEnabled)}
              className={`w-12 h-6 rounded-full transition-colors ${
                preferences.soundEnabled ? 'bg-green-500' : 'bg-gray-600'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-transform ${
                  preferences.soundEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Notification Settings */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Bell size={20} />
            Notifications
          </h3>
          
          <div className="flex items-center justify-between p-3 glass-card">
            <div className="flex items-center gap-3">
              {preferences.notifications ? (
                <Bell size={20} className="text-blue-400" />
              ) : (
                <BellOff size={20} className="text-gray-400" />
              )}
              <span>Payment Notifications</span>
            </div>
            <button
              onClick={() => updatePreference('notifications', !preferences.notifications)}
              className={`w-12 h-6 rounded-full transition-colors ${
                preferences.notifications ? 'bg-blue-500' : 'bg-gray-600'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-transform ${
                  preferences.notifications ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between p-3 glass-card">
            <div className="flex items-center gap-3">
              <span>Auto-accept Payments</span>
            </div>
            <button
              onClick={() => updatePreference('autoAcceptPayments', !preferences.autoAcceptPayments)}
              className={`w-12 h-6 rounded-full transition-colors ${
                preferences.autoAcceptPayments ? 'bg-purple-500' : 'bg-gray-600'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-transform ${
                  preferences.autoAcceptPayments ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Default Settings */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Settings size={20} />
            Defaults
          </h3>
          
          <div className="p-3 glass-card">
            <label className="block text-sm text-gray-300 mb-2">
              Default Extension Minutes
            </label>
            <input
              type="number"
              min="1"
              max="60"
              value={preferences.defaultExtensionMinutes}
              onChange={(e) => updatePreference('defaultExtensionMinutes', parseInt(e.target.value) || 10)}
              className="input-field w-full"
            />
          </div>
        </div>

        {/* Payment Statistics */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Palette size={20} />
            Payment Statistics
          </h3>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 glass-card text-center">
              <div className="text-2xl font-bold text-green-400">{stats.total.received}</div>
              <div className="text-sm text-gray-400">Payments Received</div>
            </div>
            <div className="p-3 glass-card text-center">
              <div className="text-2xl font-bold text-blue-400">{stats.total.sent}</div>
              <div className="text-sm text-gray-400">Payments Sent</div>
            </div>
            <div className="p-3 glass-card text-center col-span-2">
              <div className="text-2xl font-bold text-purple-400">{stats.total.amount.toFixed(2)} THT</div>
              <div className="text-sm text-gray-400">Total Volume</div>
            </div>
          </div>

          <div className="p-3 glass-card">
            <h4 className="font-semibold mb-2">This Week</h4>
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div>
                <div className="text-green-400 font-bold">{stats.week.received}</div>
                <div className="text-gray-400">Received</div>
              </div>
              <div>
                <div className="text-blue-400 font-bold">{stats.week.sent}</div>
                <div className="text-gray-400">Sent</div>
              </div>
              <div>
                <div className="text-purple-400 font-bold">{stats.week.amount.toFixed(1)} THT</div>
                <div className="text-gray-400">Volume</div>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={() => {
              storageManager.clearPaymentHistory();
              setPreferences(storageManager.getUserPreferences());
            }}
            className="w-full btn-secondary text-red-400 hover:text-red-300"
          >
            Clear Payment History
          </button>
        </div>
      </div>
    </Modal>
  );
}