import { useEffect, useState } from 'react';
import { formatTime } from '../utils/time';

interface CountdownProps {
  initialSeconds: number;
  isRunning: boolean;
  onTimeEnd?: () => void;
  onTimeUpdate?: (seconds: number) => void;
}

export default function Countdown({
  initialSeconds,
  isRunning,
  onTimeEnd,
  onTimeUpdate,
}: CountdownProps) {
  const [seconds, setSeconds] = useState(initialSeconds);

  useEffect(() => {
    setSeconds(initialSeconds);
  }, [initialSeconds]);

  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      setSeconds((prev) => {
        const newTime = prev - 1;
        if (newTime <= 0) {
          onTimeEnd?.();
          return 0;
        }
        onTimeUpdate?.(newTime);
        return newTime;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, onTimeEnd, onTimeUpdate]);

  return (
    <div className="countdown-display">
      <div className="text-8xl md:text-9xl font-bold font-mono tracking-wider text-white glow-text">
        {formatTime(seconds)}
      </div>
      {seconds <= 60 && seconds > 0 && (
        <div className="mt-4 text-red-400 text-xl animate-pulse">
          Time running out!
        </div>
      )}
    </div>
  );
}
