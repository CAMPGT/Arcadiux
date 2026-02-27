'use client';

import React from 'react';
import type { Sprint } from '@arcadiux/shared/types';
import type { SprintStatus } from '@arcadiux/shared/constants';
import { formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Target } from 'lucide-react';

interface SprintCardProps {
  sprint: Sprint;
  issueCount: number;
  completedCount: number;
  totalPoints: number;
  completedPoints: number;
  onClick?: () => void;
}

const statusStyles: Record<SprintStatus, string> = {
  planned: 'bg-gray-100 text-gray-700 border-gray-300',
  active: 'bg-blue-100 text-blue-700 border-blue-300',
  completed: 'bg-green-100 text-green-700 border-green-300',
};

const statusLabels: Record<SprintStatus, string> = {
  planned: 'Planificado',
  active: 'Activo',
  completed: 'Completado',
};

export function SprintCard({
  sprint,
  issueCount,
  completedCount,
  totalPoints,
  completedPoints,
  onClick,
}: SprintCardProps) {
  const progressPercent =
    totalPoints > 0 ? Math.round((completedPoints / totalPoints) * 100) : 0;

  return (
    <Card
      className={cn('cursor-pointer transition-shadow hover:shadow-md', onClick && 'cursor-pointer')}
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <CardTitle className="text-base">{sprint.name}</CardTitle>
          <Badge
            variant="outline"
            className={cn(
              'border',
              statusStyles[sprint.status as SprintStatus],
            )}
          >
            {statusLabels[sprint.status as SprintStatus]}
          </Badge>
        </div>
        {sprint.goal && (
          <div className="flex items-start gap-2 mt-1">
            <Target className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" />
            <p className="text-sm text-muted-foreground">{sprint.goal}</p>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {/* Date Range */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
          <Calendar className="h-3.5 w-3.5" />
          <span>
            {formatDate(sprint.startDate, 'MMM d')} -{' '}
            {formatDate(sprint.endDate, 'MMM d, yyyy')}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">
              {completedCount}/{issueCount} issues
            </span>
            <span className="font-medium">
              {completedPoints}/{totalPoints} pts ({progressPercent}%)
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                'h-full rounded-full transition-all',
                sprint.status === 'completed'
                  ? 'bg-green-500'
                  : 'bg-primary',
              )}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
