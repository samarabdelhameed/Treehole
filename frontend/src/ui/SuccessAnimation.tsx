import { useEffect, useState } from 'react';
import { CheckCircle, Coins } from 'lucide-react';

interface SuccessAnimationProps {
  show: boolean;
  message: string;
  amount?: string;
  onComplete?: () => void;
}

export default function SuccessAnimation({ show, message, amount, onComplete }: SuccessAnimationProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (show) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        onComplete?.();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [show, onComplete]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      <div className="animate-scaleIn">
        <div className="glass-card p-8 text-center max-w-md mx-4">
          <div className="relative mb-4">
            <CheckCircle size={64} className="text-green-400 mx-auto animate-pulse" />
            {amount && (
              <div className="absolute -top-2 -right-2 bg-purple-600 rounded-full p-2 animate-bounce">
                <Coins size={20} className="text-white" />
              </div>
            )}
          </div>
          
          <h3 className="text-2xl font-bold text-white mb-2 glow-text">
            Success!
          </h3>
          
          <p className="text-gray-300 mb-4">{message}</p>
          
          {amount && (
            <div className="glass-card p-3 bg-gradient-to-r from-green-500/20 to-purple-500/20">
              <div className="text-lg font-bold text-green-400">
                {amount} THT
              </div>
              <div className="text-sm text-gray-400">
                Transaction Completed
              </div>
            </div>
          )}
          
          {/* Confetti effect */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {[...Array(20)].map((_, i) => (
              <div
                key={i}
                className="absolute w-2 h-2 bg-gradient-to-r from-purple-400 to-orange-400 rounded-full animate-ping"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 2}s`,
                  animationDuration: `${1 + Math.random()}s`
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}