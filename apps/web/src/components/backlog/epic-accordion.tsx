'use client';

import React, { useState } from 'react';
import type { Issue, User, WorkflowStatus } from '@arcadiux/shared/types';
import type { PriorityLevel } from '@arcadiux/shared/constants';
import { ChevronDown, ChevronRight, Zap } from 'lucide-react';
import { cn, getIssueKey } from '@/lib/utils';
import { PriorityIcon } from '@/components/shared/priority-icon';
import { StatusBadge } from '@/components/shared/status-badge';
import { AvatarDisplay } from '@/components/shared/avatar-display';
import { useIssueModal } from '@/stores/use-issue-modal';
import { Badge } from '@/components/ui/badge';

interface EpicAccordionProps {
  epic: Issue;
  children: Issue[];
  projectKey: string;
  members: Record<string, User>;
  statuses: Record<string, WorkflowStatus>;
}

export function EpicAccordion({
  epic,
  children,
  projectKey,
  members,
  statuses,
}: EpicAccordionProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const { openIssue } = useIssueModal();

  const totalPoints = children.reduce(
    (sum, issue) => sum + (issue.storyPoints ?? 0),
    0,
  );
  const doneCount = children.filter((issue) => {
    const status = statuses[issue.statusId];
    return status?.category === 'done';
  }).length;

  return (
    <div className="rounded-lg border">
      {/* Epic Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center gap-3 p-4 text-left hover:bg-muted/50 transition-colors"
      >
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}
        <Zap className="h-4 w-4 shrink-0 text-violet-600" />
        <span className="text-xs font-medium text-muted-foreground">
          {getIssueKey(projectKey, epic.issueNumber)}
        </span>
        <span className="flex-1 text-sm font-semibold">{epic.title}</span>
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="text-xs">
            {doneCount}/{children.length} completados
          </Badge>
          {totalPoints > 0 && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
              {totalPoints} pts
            </span>
          )}
          <PriorityIcon priority={epic.priority as PriorityLevel} />
        </div>
      </button>

      {/* Children */}
      {isExpanded && children.length > 0 && (
        <div className="border-t">
          {children.map((issue) => {
            const status = statuses[issue.statusId];
            const assignee = issue.assigneeId
              ? members[issue.assigneeId]
              : null;

            return (
              <button
                key={issue.id}
                onClick={() => openIssue(issue.id)}
                className="flex w-full items-center gap-3 border-b last:border-b-0 px-4 py-3 pl-12 text-left hover:bg-muted/50 transition-colors"
              >
                <span className="text-xs font-medium text-muted-foreground">
                  {getIssueKey(projectKey, issue.issueNumber)}
                </span>
                <span className="flex-1 text-sm">{issue.title}</span>
                <div className="flex items-center gap-3">
                  {status && (
                    <StatusBadge
                      name={status.name}
                      category={status.category}
                    />
                  )}
                  <PriorityIcon priority={issue.priority as PriorityLevel} />
                  {issue.storyPoints !== null && (
                    <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                      {issue.storyPoints}
                    </span>
                  )}
                  {assignee && (
                    <AvatarDisplay
                      fullName={assignee.fullName}
                      avatarUrl={assignee.avatarUrl}
                      size="sm"
                    />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {isExpanded && children.length === 0 && (
        <div className="border-t px-4 py-6 text-center text-sm text-muted-foreground">
          Aún no hay historias o tareas en esta épica.
        </div>
      )}
    </div>
  );
}
