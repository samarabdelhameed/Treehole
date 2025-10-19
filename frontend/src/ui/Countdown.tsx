import { useEffect, useState, useRef, useCallback } from 'react';
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
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const onTimeEndRef = useRef(onTimeEnd);
  const onTimeUpdateRef = useRef(onTimeUpdate);

  // Update refs when props change
  useEffect(() => {
    onTimeEndRef.current = onTimeEnd;
    onTimeUpdateRef.current = onTimeUpdate;
  });

  useEffect(() => {
    setSeconds(initialSeconds);
  }, [initialSeconds]);

  const tick = useCallback(() => {
    setSeconds((prev) => {
      const newTime = prev - 1;
      if (newTime <= 0) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        // Use setTimeout to avoid setState during render
        setTimeout(() => onTimeEndRef.current?.(), 0);
        return 0;
      }
      // Use setTimeout to avoid setState during render
      setTimeout(() => onTimeUpdateRef.current?.(newTime), 0);
      return newTime;
    });
  }, []);

  useEffect(() => {
    if (isRunning && seconds > 0) {
      intervalRef.current = setInterval(tick, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isRunning, tick]);

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
