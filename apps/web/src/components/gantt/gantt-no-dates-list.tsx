'use client';

import React from 'react';
import {
  Zap,
  BookOpen,
  CheckSquare,
  GitBranch,
  Bug,
} from 'lucide-react';
import type { Issue } from '@arcadiux/shared/types';
import type { IssueType } from '@arcadiux/shared/constants';
import { cn, getIssueKey } from '@/lib/utils';

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

interface GanttNoDatesListProps {
  issues: Issue[];
  projectKey: string;
  onIssueClick: (issueId: string) => void;
}

export function GanttNoDatesList({ issues, projectKey, onIssueClick }: GanttNoDatesListProps) {
  if (issues.length === 0) return null;

  return (
    <div className="border-t bg-muted/30 px-4 py-3">
      <p className="mb-2 text-xs font-semibold text-muted-foreground">
        Issues sin fechas ({issues.length})
      </p>
      <div className="flex flex-wrap gap-2">
        {issues.map((issue) => {
          const TypeIcon = typeIcons[issue.type as IssueType];
          const key = getIssueKey(projectKey, issue.issueNumber);
          return (
            <button
              key={issue.id}
              onClick={() => onIssueClick(issue.id)}
              className="flex items-center gap-1.5 rounded-md border bg-background px-2.5 py-1.5 text-xs transition-colors hover:bg-accent"
            >
              <TypeIcon className={cn('h-3 w-3', typeColors[issue.type as IssueType])} />
              <span className="font-medium text-muted-foreground">{key}</span>
              <span className="max-w-[150px] truncate">{issue.title}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
