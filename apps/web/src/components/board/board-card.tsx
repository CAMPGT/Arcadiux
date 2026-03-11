'use client';

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Calendar,
  Clock,
  ArrowRightLeft,
} from 'lucide-react';
import type { Issue, User, Sprint } from '@arcadiux/shared/types';
import type { IssueType, IssueCategory, PriorityLevel } from '@arcadiux/shared/constants';
import { IssueCategoryLabels } from '@arcadiux/shared/constants';
import { cn, getIssueKey, formatDate } from '@/lib/utils';
import { getDeadlineStatus } from '@/lib/gantt-utils';
import { PriorityIcon } from '@/components/shared/priority-icon';
import { AvatarDisplay } from '@/components/shared/avatar-display';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useIssueModal } from '@/stores/use-issue-modal';
import { typeIcons, typeColors } from '@/lib/issue-utils';

interface BoardCardProps {
  issue: Issue;
  projectKey: string;
  assignee?: User | null;
  responsibleNames?: string[];
  statusCategory?: string;
  moveTargetSprints?: Sprint[];
  onMoveSprint?: (issueId: string, sprintId: string) => void;
}

const categoryColors: Record<IssueCategory, string> = {
  nueva_funcionalidad: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  soporte: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  testeo: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
  funcionalidad_interna: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  ventas: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  administracion: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  otros: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
};

export function BoardCard({ issue, projectKey, assignee, responsibleNames, statusCategory, moveTargetSprints, onMoveSprint }: BoardCardProps) {
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
        'group w-full rounded-lg border bg-card p-3 text-left shadow-sm transition-shadow hover:shadow-md cursor-grab active:cursor-grabbing',
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
          <p className="mt-0.5 text-sm font-medium leading-tight text-foreground line-clamp-2" title={issue.title}>
            {issue.title}
          </p>
        </div>
        {onMoveSprint && moveTargetSprints && moveTargetSprints.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="h-6 w-6 shrink-0 rounded opacity-0 group-hover:opacity-100 hover:bg-accent flex items-center justify-center transition-opacity"
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
                title="Mover a otro sprint"
                aria-label="Mover a otro sprint"
              >
                <ArrowRightLeft className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              {moveTargetSprints.map((sprint) => (
                <DropdownMenuItem
                  key={sprint.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    onMoveSprint(issue.id, sprint.id);
                  }}
                >
                  {sprint.name}
                  {sprint.status === 'active' ? ' (Activo)' : ''}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {issue.category && (
        <div className="mt-2">
          <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold', categoryColors[issue.category as IssueCategory])}>
            {IssueCategoryLabels[issue.category as IssueCategory] ?? issue.category}
          </span>
        </div>
      )}

      {responsibleNames && responsibleNames.length > 0 && (
        <p className="mt-1.5 text-[11px] text-muted-foreground truncate" title={`Resp: ${responsibleNames.join(', ')}`}>
          <span className="font-medium">Resp:</span> {responsibleNames.join(', ')}
        </p>
      )}

      {(issue.startDate || issue.endDate) && (
        <div className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Calendar className="h-3 w-3 shrink-0" />
          <span>
            {issue.startDate
              ? formatDate(issue.startDate, 'dd MMM')
              : '—'}
            {' → '}
            {issue.endDate
              ? formatDate(issue.endDate, 'dd MMM')
              : '—'}
          </span>
          {(() => {
            const isDone = statusCategory === 'done' || statusCategory === 'cancelled';
            const dl = getDeadlineStatus(issue.endDate, isDone ? issue.updatedAt : null);
            if (!dl) return null;
            return (
              <span
                className="ml-auto inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
                style={{ backgroundColor: dl.bgLight, color: dl.textDark }}
              >
                <Clock className="h-2.5 w-2.5" />
                {dl.daysOverdue > 0
                  ? `${dl.daysOverdue}d atrasado`
                  : dl.label}
              </span>
            );
          })()}
        </div>
      )}

      <div className="mt-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <PriorityIcon priority={issue.priority as PriorityLevel} showLabel />
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
