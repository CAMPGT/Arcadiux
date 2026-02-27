'use client';

import React from 'react';
import {
  Zap,
  BookOpen,
  CheckSquare,
  GitBranch,
  Bug,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';
import type { IssueType } from '@arcadiux/shared/constants';
import { cn } from '@/lib/utils';

const typeIcons: Record<IssueType, React.ElementType> = {
  epic: Zap,
  story: BookOpen,
  task: CheckSquare,
  subtask: GitBranch,
  bug: Bug,
};

const typeColors: Record<IssueType, string> = {
  epic: 'text-violet-600',
  story: 'text-green-600',
  task: 'text-blue-600',
  subtask: 'text-cyan-600',
  bug: 'text-red-600',
};

interface GanttRowLabelProps {
  issueKey: string;
  title: string;
  type: IssueType;
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
  indent,
  isGroup,
  isExpanded,
  onToggle,
  onClick,
}: GanttRowLabelProps) {
  const TypeIcon = typeIcons[type];

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
        className="flex min-w-0 items-center gap-1.5 hover:text-primary"
      >
        <span className="shrink-0 text-xs font-medium text-muted-foreground">
          {issueKey}
        </span>
        <span className="truncate text-xs">{title}</span>
      </button>
    </div>
  );
}
