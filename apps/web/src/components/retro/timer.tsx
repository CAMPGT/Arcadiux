'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Play, Pause, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface TimerProps {
  initialSeconds: number;
  isRunning: boolean;
  startedAt: string | null;
  onToggle: () => void;
}

function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

export function Timer({
  initialSeconds,
  isRunning,
  startedAt,
  onToggle,
}: TimerProps) {
  const [remaining, setRemaining] = useState(initialSeconds);

  const calculateRemaining = useCallback(() => {
    if (!isRunning || !startedAt) {
      return initialSeconds;
    }
    const elapsed = Math.floor(
      (Date.now() - new Date(startedAt).getTime()) / 1000,
    );
    return Math.max(0, initialSeconds - elapsed);
  }, [isRunning, startedAt, initialSeconds]);

  useEffect(() => {
    setRemaining(calculateRemaining());

    if (!isRunning) return;

    const interval = setInterval(() => {
      const newRemaining = calculateRemaining();
      setRemaining(newRemaining);
      if (newRemaining <= 0) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, calculateRemaining]);

  const isWarning = remaining <= 30 && remaining > 0;
  const isExpired = remaining <= 0;

  return (
    <div className="flex items-center gap-3">
      <div
        className={cn(
          'rounded-lg px-4 py-2 font-mono text-2xl font-bold tabular-nums',
          isExpired && 'bg-red-100 text-red-700',
          isWarning && !isExpired && 'bg-yellow-100 text-yellow-700',
          !isWarning && !isExpired && 'bg-muted text-foreground',
        )}
      >
        {formatTime(remaining)}
      </div>
      <Button
        variant="outline"
        size="icon"
        onClick={onToggle}
        className="h-10 w-10"
      >
        {isRunning ? (
          <Pause className="h-4 w-4" />
        ) : (
          <Play className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}
