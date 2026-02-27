'use client';

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Zap,
  BookOpen,
  CheckSquare,
  GitBranch,
  Bug,
} from 'lucide-react';
import type { Issue, User } from '@arcadiux/shared/types';
import type { IssueType, IssueCategory, PriorityLevel } from '@arcadiux/shared/constants';
import { IssueCategoryLabels } from '@arcadiux/shared/constants';
import { cn, getIssueKey } from '@/lib/utils';
import { PriorityIcon } from '@/components/shared/priority-icon';
import { AvatarDisplay } from '@/components/shared/avatar-display';
import { useIssueModal } from '@/stores/use-issue-modal';

interface BoardCardProps {
  issue: Issue;
  projectKey: string;
  assignee?: User | null;
  responsibleName?: string | null;
}

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

const categoryColors: Record<IssueCategory, string> = {
  nueva_funcionalidad: 'bg-emerald-100 text-emerald-700',
  soporte: 'bg-amber-100 text-amber-700',
  testeo: 'bg-sky-100 text-sky-700',
  funcionalidad_interna: 'bg-purple-100 text-purple-700',
  ventas: 'bg-indigo-100 text-indigo-700',
  administracion: 'bg-orange-100 text-orange-700',
  otros: 'bg-gray-100 text-gray-700',
};

export function BoardCard({ issue, projectKey, assignee, responsibleName }: BoardCardProps) {
  const { openIssue } = useIssueModal();
  const TypeIcon = typeIcons[issue.type];
  const issueKey = getIssueKey(projectKey, issue.issueNumber);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: issue.id,
    data: { type: 'issue', issue },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        'w-full rounded-lg border bg-card p-3 text-left shadow-sm transition-shadow hover:shadow-md cursor-grab active:cursor-grabbing',
        isDragging && 'opacity-50 shadow-lg ring-2 ring-primary',
      )}
      onClick={() => openIssue(issue.id)}
    >
      <div className="flex items-start gap-2">
        <TypeIcon
          className={cn('mt-0.5 h-4 w-4 shrink-0', typeColors[issue.type])}
        />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-muted-foreground">
            {issueKey}
          </p>
          <p className="mt-0.5 text-sm font-medium leading-tight text-foreground line-clamp-2">
            {issue.title}
          </p>
        </div>
      </div>

      {issue.category && (
        <div className="mt-2">
          <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold', categoryColors[issue.category as IssueCategory])}>
            {IssueCategoryLabels[issue.category as IssueCategory] ?? issue.category}
          </span>
        </div>
      )}

      {responsibleName && (
        <p className="mt-1.5 text-[11px] text-muted-foreground truncate">
          <span className="font-medium">Resp:</span> {responsibleName}
        </p>
      )}

      <div className="mt-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <PriorityIcon priority={issue.priority as PriorityLevel} />
          {issue.storyPoints !== null && (
            <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
              {issue.storyPoints}
            </span>
          )}
        </div>
        {assignee && (
          <AvatarDisplay
            fullName={assignee.fullName}
            avatarUrl={assignee.avatarUrl}
            size="sm"
          />
        )}
      </div>
    </div>
  );
}
