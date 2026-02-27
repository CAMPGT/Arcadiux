'use client';

import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import type { WorkflowStatus, Issue, User, Responsible } from '@arcadiux/shared/types';
import { cn } from '@/lib/utils';
import { WipBadge } from './wip-badge';
import { BoardCard } from './board-card';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BoardColumnProps {
  status: WorkflowStatus;
  issues: Issue[];
  projectKey: string;
  members: Record<string, User>;
  responsibles?: Record<string, Responsible>;
  onAddIssue?: (statusId: string) => void;
}

export function BoardColumn({
  status,
  issues,
  projectKey,
  members,
  responsibles,
  onAddIssue,
}: BoardColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `column-${status.id}`,
    data: { type: 'column', statusId: status.id },
  });

  return (
    <div className="flex w-72 shrink-0 flex-col rounded-lg bg-muted/50">
      {/* Column Header */}
      <div className="flex items-center justify-between p-3">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              'h-2 w-2 rounded-full',
              status.category === 'todo' && 'bg-gray-400',
              status.category === 'in_progress' && 'bg-blue-500',
              status.category === 'done' && 'bg-green-500',
            )}
          />
          <h3 className="text-sm font-semibold text-foreground">
            {status.name}
          </h3>
          <WipBadge current={issues.length} max={status.wipLimit} />
        </div>
        {onAddIssue && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => onAddIssue(status.id)}
          >
            <Plus className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Cards - droppable area */}
      <div
        ref={setNodeRef}
        className={cn(
          'flex flex-1 flex-col gap-2 overflow-y-auto p-2 pt-0 min-h-[80px] rounded-b-lg transition-colors',
          isOver && 'bg-primary/10',
        )}
      >
        <SortableContext
          items={issues.map((i) => i.id)}
          strategy={verticalListSortingStrategy}
        >
          {issues.map((issue) => (
            <BoardCard
              key={issue.id}
              issue={issue}
              projectKey={projectKey}
              assignee={issue.assigneeId ? members[issue.assigneeId] : null}
              responsibleName={issue.responsibleId && responsibles?.[issue.responsibleId]?.fullName}
            />
          ))}
        </SortableContext>

        {issues.length === 0 && !isOver && (
          <div className="flex items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/20 p-6">
            <p className="text-xs text-muted-foreground">Sin issues</p>
          </div>
        )}
      </div>
    </div>
  );
}
