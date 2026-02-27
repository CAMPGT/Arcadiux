'use client';

import React from 'react';
import {
  AlertTriangle,
  ArrowUp,
  ArrowRight,
  ArrowDown,
} from 'lucide-react';
import type { PriorityLevel } from '@arcadiux/shared/constants';
import { cn } from '@/lib/utils';

interface PriorityIconProps {
  priority: PriorityLevel;
  className?: string;
  showLabel?: boolean;
}

const priorityConfig: Record<
  PriorityLevel,
  { icon: React.ElementType; color: string; label: string }
> = {
  critical: {
    icon: AlertTriangle,
    color: 'text-red-600',
    label: 'Crítica',
  },
  high: {
    icon: ArrowUp,
    color: 'text-orange-600',
    label: 'Alta',
  },
  medium: {
    icon: ArrowRight,
    color: 'text-yellow-600',
    label: 'Media',
  },
  low: {
    icon: ArrowDown,
    color: 'text-green-600',
    label: 'Baja',
  },
};

export function PriorityIcon({
  priority,
  className,
  showLabel = false,
}: PriorityIconProps) {
  const config = priorityConfig[priority];
  const Icon = config.icon;

  return (
    <span className={cn('inline-flex items-center gap-1', className)}>
      <Icon className={cn('h-4 w-4', config.color)} />
      {showLabel && (
        <span className={cn('text-xs font-medium', config.color)}>
          {config.label}
        </span>
      )}
    </span>
  );
}
