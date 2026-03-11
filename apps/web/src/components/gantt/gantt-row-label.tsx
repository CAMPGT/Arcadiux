'use client';

import React from 'react';
import {
  ChevronRight,
  ChevronDown,
} from 'lucide-react';
import type { IssueType } from '@arcadiux/shared/constants';
import { cn } from '@/lib/utils';
import { getDeadlineStatus } from '@/lib/gantt-utils';
import { typeIcons, typeColors } from '@/lib/issue-utils';

interface GanttRowLabelProps {
  issueKey: string;
  title: string;
  type: IssueType;
  endDate?: string | null;
  updatedAt?: string | null;
  statusCategory?: string | null;
  indent?: boolean;
  isGroup?: boolean;
  isExpanded?: boolean;
  onToggle?: () => void;
  onClick?: () => void;
}

export function GanttRowLabel({
  issueKey,
  title,
  type,
  endDate,
  updatedAt,
  statusCategory,
  indent,
  isGroup,
  isExpanded,
  onToggle,
  onClick,
}: GanttRowLabelProps) {
  const TypeIcon = typeIcons[type];
  const isDone = statusCategory === 'done' || statusCategory === 'cancelled';
  const deadline = getDeadlineStatus(endDate ?? null, isDone ? updatedAt : null);

  return (
    <div
      className={cn(
        'flex h-10 items-center gap-1.5 border-b px-2 text-sm',
        indent && 'pl-6',
      )}
    >
      {isGroup && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggle?.();
          }}
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded hover:bg-accent"
          aria-label={isExpanded ? 'Colapsar grupo' : 'Expandir grupo'}
        >
          {isExpanded ? (
            <ChevronDown className="h-3.5 w-3.5" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5" />
          )}
        </button>
      )}
      <TypeIcon className={cn('h-3.5 w-3.5 shrink-0', typeColors[type])} />
      <button
        onClick={onClick}
        className="flex min-w-0 flex-1 items-center gap-1.5 hover:text-primary"
      >
        <span className="shrink-0 text-xs font-medium text-muted-foreground">
          {issueKey}
        </span>
        <span className="truncate text-xs" title={title}>{title}</span>
      </button>
      {deadline && (
        <span
          className="h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: deadline.color }}
          title={deadline.daysOverdue > 0
            ? `${deadline.daysOverdue}d atrasado`
            : deadline.label}
        />
      )}
    </div>
  );
}
