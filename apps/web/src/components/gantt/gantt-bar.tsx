'use client';

import React from 'react';
import type { IssueType } from '@arcadiux/shared/constants';
import { cn } from '@/lib/utils';
import { useGanttDrag } from '@/hooks/use-gantt-drag';
import { getBarStyle, safeParseDate } from '@/lib/gantt-utils';

const barColors: Record<IssueType, string> = {
  epic: 'bg-issue-epic',
  story: 'bg-issue-story',
  task: 'bg-issue-task',
  subtask: 'bg-issue-subtask',
  bug: 'bg-issue-bug',
};

interface GanttBarProps {
  issueId: string;
  issueKey: string;
  type: IssueType;
  startDateStr: string;
  endDateStr: string;
  timelineStart: Date;
  timelineEnd: Date;
  dayWidthPx: number;
  onResize: (issueId: string, newStart: Date, newEnd: Date) => void;
  onClick: () => void;
}

export function GanttBar({
  issueId,
  issueKey,
  type,
  startDateStr,
  endDateStr,
  timelineStart,
  timelineEnd,
  dayWidthPx,
  onResize,
  onClick,
}: GanttBarProps) {
  const startDate = safeParseDate(startDateStr)!;
  const endDate = safeParseDate(endDateStr)!;

  const { leftHandleProps, rightHandleProps, isDragging, previewStyle, didDragRef } =
    useGanttDrag({
      issueId,
      startDate,
      endDate,
      timelineStart,
      timelineEnd,
      dayWidthPx,
      onResize,
    });

  const baseStyle = getBarStyle(startDate, endDate, timelineStart, dayWidthPx);
  const style = previewStyle ?? baseStyle;

  const handleClick = () => {
    if (!didDragRef.current) {
      onClick();
    }
  };

  return (
    <div
      className={cn(
        'group absolute top-1 flex h-7 cursor-pointer items-center rounded-md text-white shadow-sm transition-shadow hover:shadow-md',
        barColors[type],
        isDragging && 'opacity-80 ring-2 ring-primary ring-offset-1',
      )}
      style={{
        left: style.left,
        width: Math.max(style.width, dayWidthPx),
      }}
      onClick={handleClick}
    >
      {/* Left drag handle */}
      <div
        {...leftHandleProps}
        className="absolute -left-0.5 top-0 z-10 h-full w-2 cursor-col-resize"
      >
        <div className="absolute left-0.5 top-1 h-[calc(100%-8px)] w-1 rounded-full bg-white/0 transition-colors group-hover:bg-white/50" />
      </div>

      {/* Bar content */}
      <span className="truncate px-2 text-[10px] font-medium">
        {issueKey}
      </span>

      {/* Right drag handle */}
      <div
        {...rightHandleProps}
        className="absolute -right-0.5 top-0 z-10 h-full w-2 cursor-col-resize"
      >
        <div className="absolute right-0.5 top-1 h-[calc(100%-8px)] w-1 rounded-full bg-white/0 transition-colors group-hover:bg-white/50" />
      </div>
    </div>
  );
}

/**
 * Thin marker for issues with only one date set.
 */
export function GanttMarker({
  dateStr,
  type,
  timelineStart,
  dayWidthPx,
  onClick,
}: {
  dateStr: string;
  type: IssueType;
  timelineStart: Date;
  dayWidthPx: number;
  onClick: () => void;
}) {
  const date = safeParseDate(dateStr)!;
  const baseStyle = getBarStyle(date, date, timelineStart, dayWidthPx);

  return (
    <div
      className={cn(
        'absolute top-2 h-5 w-1 cursor-pointer rounded-full',
        barColors[type],
      )}
      style={{ left: baseStyle.left + dayWidthPx / 2 - 2 }}
      onClick={onClick}
    />
  );
}
