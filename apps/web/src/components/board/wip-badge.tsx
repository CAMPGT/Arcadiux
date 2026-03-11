'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface WipBadgeProps {
  current: number;
  max: number | null;
}

export function WipBadge({ current, max }: WipBadgeProps) {
  if (max === null) {
    return (
      <span className="text-xs text-muted-foreground">{current}</span>
    );
  }

  const isOver = current > max;

  return (
    <span
      className={cn(
        'rounded-full px-2 py-0.5 text-xs font-medium',
        isOver
          ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
          : 'bg-muted text-muted-foreground',
      )}
    >
      {current}/{max}
    </span>
  );
}
