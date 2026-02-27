'use client';

import React, { useState, useMemo } from 'react';
import type { Issue, User, WorkflowStatus, Sprint, Responsible } from '@arcadiux/shared/types';
import type { IssueType, IssueCategory, PriorityLevel } from '@arcadiux/shared/constants';
import { IssueCategoryLabels } from '@arcadiux/shared/constants';
import { format, parseISO } from 'date-fns';
import { getIssueKey } from '@/lib/utils';
import { PriorityIcon } from '@/components/shared/priority-icon';
import { AvatarDisplay } from '@/components/shared/avatar-display';
import { StatusBadge } from '@/components/shared/status-badge';
import { useIssueModal } from '@/stores/use-issue-modal';
import {
  Zap,
  BookOpen,
  CheckSquare,
  GitBranch,
  Bug,
  ArrowUpDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface BacklogTableProps {
  issues: Issue[];
  projectKey: string;
  members: Record<string, User>;
  statuses: Record<string, WorkflowStatus>;
  sprints: Record<string, Sprint>;
  responsibles?: Record<string, Responsible>;
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

type SortField = 'issueNumber' | 'title' | 'priority' | 'storyPoints' | 'type';
type SortDirection = 'asc' | 'desc';

const priorityOrder: Record<PriorityLevel, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

export function BacklogTable({
  issues,
  projectKey,
  members,
  statuses,
  sprints,
  responsibles,
}: BacklogTableProps) {
  const { openIssue } = useIssueModal();
  const [sortField, setSortField] = useState<SortField>('issueNumber');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedIssues = useMemo(() => {
    return [...issues].sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'issueNumber':
          comparison = a.issueNumber - b.issueNumber;
          break;
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'priority':
          comparison =
            priorityOrder[a.priority as PriorityLevel] -
            priorityOrder[b.priority as PriorityLevel];
          break;
        case 'storyPoints':
          comparison = (a.storyPoints ?? 0) - (b.storyPoints ?? 0);
          break;
        case 'type':
          comparison = a.type.localeCompare(b.type);
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [issues, sortField, sortDirection]);

  const SortButton = ({
    field,
    children,
  }: {
    field: SortField;
    children: React.ReactNode;
  }) => (
    <Button
      variant="ghost"
      size="sm"
      className="-ml-3 h-8 data-[state=open]:bg-accent"
      onClick={() => handleSort(field)}
    >
      {children}
      <ArrowUpDown className="ml-2 h-3 w-3" />
    </Button>
  );

  return (
    <div className="rounded-md border">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left">
                <SortButton field="type">Tipo</SortButton>
              </th>
              <th className="px-4 py-3 text-left">
                <SortButton field="issueNumber">Clave</SortButton>
              </th>
              <th className="px-4 py-3 text-left">
                <SortButton field="title">Título</SortButton>
              </th>
              <th className="px-4 py-3 text-left">Sprint</th>
              <th className="px-4 py-3 text-left">Estado</th>
              <th className="px-4 py-3 text-left">
                <SortButton field="priority">Prioridad</SortButton>
              </th>
              <th className="px-4 py-3 text-left">Categoría</th>
              <th className="px-4 py-3 text-left">Asignado</th>
              <th className="px-4 py-3 text-left">Responsable</th>
              <th className="px-4 py-3 text-left">F. Inicio</th>
              <th className="px-4 py-3 text-left">F. Final</th>
              <th className="px-4 py-3 text-right">
                <SortButton field="storyPoints">Puntos</SortButton>
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedIssues.map((issue) => {
              const TypeIcon = typeIcons[issue.type as IssueType];
              const status = statuses[issue.statusId];
              const assignee = issue.assigneeId
                ? members[issue.assigneeId]
                : null;
              const responsible = issue.responsibleId && responsibles
                ? responsibles[issue.responsibleId]
                : null;

              return (
                <tr
                  key={issue.id}
                  className="border-b transition-colors hover:bg-muted/50 cursor-pointer"
                  onClick={() => openIssue(issue.id)}
                >
                  <td className="px-4 py-3">
                    <TypeIcon
                      className={cn(
                        'h-4 w-4',
                        typeColors[issue.type as IssueType],
                      )}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-medium text-muted-foreground">
                      {getIssueKey(projectKey, issue.issueNumber)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm font-medium">{issue.title}</span>
                  </td>
                  <td className="px-4 py-3">
                    {issue.sprintId && sprints[issue.sprintId] ? (
                      <span className="rounded-full bg-blue-100 text-blue-700 px-2 py-0.5 text-xs font-medium">
                        {sprints[issue.sprintId].name}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">--</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {status && (
                      <StatusBadge
                        name={status.name}
                        category={status.category}
                      />
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <PriorityIcon
                      priority={issue.priority as PriorityLevel}
                      showLabel
                    />
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-muted-foreground">
                      {IssueCategoryLabels[issue.category as IssueCategory] ?? issue.category ?? '--'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {assignee ? (
                      <div className="flex items-center gap-2">
                        <AvatarDisplay
                          fullName={assignee.fullName}
                          avatarUrl={assignee.avatarUrl}
                          size="sm"
                        />
                        <span className="text-xs text-muted-foreground">
                          {assignee.fullName}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        Sin asignar
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {responsible ? (
                      <span className="text-xs text-muted-foreground">
                        {responsible.fullName}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        --
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-muted-foreground">
                      {issue.startDate
                        ? format(parseISO(issue.startDate), 'dd/MM/yyyy')
                        : '--'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-muted-foreground">
                      {issue.endDate
                        ? format(parseISO(issue.endDate), 'dd/MM/yyyy')
                        : '--'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {issue.storyPoints !== null ? (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold">
                        {issue.storyPoints}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">--</span>
                    )}
                  </td>
                </tr>
              );
            })}

            {sortedIssues.length === 0 && (
              <tr>
                <td
                  colSpan={12}
                  className="px-4 py-12 text-center text-sm text-muted-foreground"
                >
                  No se encontraron issues. Crea tu primer issue para comenzar.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
