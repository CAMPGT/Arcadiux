'use client';

import React from 'react';
import type { TimelineColumn } from '@/lib/gantt-utils';
import type { ZoomLevel } from '@/lib/gantt-utils';
import { cn } from '@/lib/utils';
import { getDayWidth } from '@/lib/gantt-utils';

interface GanttTimelineHeaderProps {
  columns: TimelineColumn[];
  zoom: ZoomLevel;
}

export function GanttTimelineHeader({ columns, zoom }: GanttTimelineHeaderProps) {
  const dayWidth = getDayWidth(zoom);
  const colWidth = zoom === 'week' ? dayWidth * 7 : dayWidth;

  return (
    <div className="flex border-b bg-muted/50">
      {columns.map((col, i) => (
        <div
          key={i}
          className={cn(
            'shrink-0 border-r px-1 py-1.5 text-center text-[10px] font-medium text-muted-foreground',
            col.isToday && 'bg-primary/10 font-semibold text-primary',
            col.isWeekend && !col.isToday && 'bg-muted/80',
          )}
          style={{ width: colWidth }}
        >
          {col.label}
        </div>
      ))}
    </div>
  );
}
