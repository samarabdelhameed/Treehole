import { useEffect } from 'react';
import { CheckCircle, XCircle, AlertCircle, Info } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastProps {
  message: string;
  type: ToastType;
  onClose: () => void;
  duration?: number;
}

export default function Toast({ message, type, onClose, duration = 5000 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const icons = {
    success: <CheckCircle size={24} className="text-green-400" />,
    error: <XCircle size={24} className="text-red-400" />,
    warning: <AlertCircle size={24} className="text-yellow-400" />,
    info: <Info size={24} className="text-blue-400" />,
  };

  const colors = {
    success: 'from-green-500/20 to-green-900/20 border-green-500/50',
    error: 'from-red-500/20 to-red-900/20 border-red-500/50',
    warning: 'from-yellow-500/20 to-yellow-900/20 border-yellow-500/50',
    info: 'from-blue-500/20 to-blue-900/20 border-blue-500/50',
  };

  return (
    <div
      className={`fixed top-4 right-4 z-50 max-w-md bg-gradient-to-br ${colors[type]} border rounded-xl shadow-2xl p-4 flex items-start gap-3 animate-slideInRight`}
    >
      {icons[type]}
      <p className="flex-1 text-white">{message}</p>
      <button
        onClick={onClose}
        className="text-gray-400 hover:text-white transition-colors"
      >
        ×
      </button>
    </div>
  );
}
