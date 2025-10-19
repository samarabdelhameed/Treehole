import { useState, useEffect } from 'react';
import { History, ArrowUpRight, ArrowDownLeft, Clock, CheckCircle, XCircle } from 'lucide-react';
import Modal from './Modal';
import { storageManager, PaymentRecord } from '../utils/storage';

interface PaymentHistoryProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PaymentHistory({ isOpen, onClose }: PaymentHistoryProps) {
  const [history, setHistory] = useState<PaymentRecord[]>([]);
  const [filter, setFilter] = useState<'all' | 'sent' | 'received'>('all');

  useEffect(() => {
    if (isOpen) {
      setHistory(storageManager.getPaymentHistory());
    }
  }, [isOpen]);

  const filteredHistory = history.filter(record => {
    if (filter === 'all') return true;
    return record.type === filter;
  });

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getStatusIcon = (status: PaymentRecord['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle size={16} className="text-green-400" />;
      case 'pending':
        return <Clock size={16} className="text-yellow-400" />;
      case 'failed':
        return <XCircle size={16} className="text-red-400" />;
    }
  };

  const getTypeIcon = (type: PaymentRecord['type']) => {
    return type === 'sent' ? (
      <ArrowUpRight size={16} className="text-red-400" />
    ) : (
      <ArrowDownLeft size={16} className="text-green-400" />
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Payment History">
      <div className="space-y-4">
        {/* Filter Tabs */}
        <div className="flex gap-2">
          {(['all', 'sent', 'received'] as const).map((filterType) => (
            <button
              key={filterType}
              onClick={() => setFilter(filterType)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === filterType
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {filterType.charAt(0).toUpperCase() + filterType.slice(1)}
            </button>
          ))}
        </div>

        {/* History List */}
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {filteredHistory.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <History size={48} className="mx-auto mb-4 opacity-50" />
              <p>No payment history yet</p>
              <p className="text-sm">Your transactions will appear here</p>
            </div>
          ) : (
            filteredHistory.map((record) => (
              <div key={record.id} className="glass-card p-4 hover:border-purple-500/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                      {getTypeIcon(record.type)}
                      {getStatusIcon(record.status)}
                    </div>
                    <div>
                      <div className="font-medium text-white">
                        {record.type === 'sent' ? 'Sent to' : 'Received from'} {formatAddress(record.counterparty)}
                      </div>
                      <div className="text-sm text-gray-400">
                        {record.extensionMinutes} minutes • {formatDate(record.timestamp)}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`font-bold ${
                      record.type === 'sent' ? 'text-red-400' : 'text-green-400'
                    }`}>
                      {record.type === 'sent' ? '-' : '+'}{record.amount} THT
                    </div>
                    <div className="text-xs text-gray-400">
                      {record.status}
                    </div>
                  </div>
                </div>
                
                {/* Transaction Hash */}
                <div className="mt-2 pt-2 border-t border-gray-700">
                  <div className="text-xs text-gray-500 font-mono">
                    Tx: {formatAddress(record.txHash)}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Summary */}
        {filteredHistory.length > 0 && (
          <div className="glass-card p-4 border-t border-gray-700">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-lg font-bold text-white">
                  {filteredHistory.filter(r => r.status === 'completed').length}
                </div>
                <div className="text-sm text-gray-400">Completed</div>
              </div>
              <div>
                <div className="text-lg font-bold text-yellow-400">
                  {filteredHistory.filter(r => r.status === 'pending').length}
                </div>
                <div className="text-sm text-gray-400">Pending</div>
              </div>
              <div>
                <div className="text-lg font-bold text-purple-400">
                  {filteredHistory
                    .filter(r => r.status === 'completed')
                    .reduce((sum, r) => sum + parseFloat(r.amount), 0)
                    .toFixed(2)} THT
                </div>
                <div className="text-sm text-gray-400">Total Volume</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}