import { useMemo } from 'react';
import { startOfDay, addDays } from 'date-fns';
import type { Issue, Sprint } from '@arcadiux/shared/types';
import {
  type ZoomLevel,
  type TimelineColumn,
  getDayWidth,
  generateDayColumns,
  generateWeekColumns,
  computeTimelineRange,
  safeParseDate,
  diffDays,
} from '@/lib/gantt-utils';

export interface UseGanttTimelineReturn {
  timelineStart: Date;
  timelineEnd: Date;
  totalDays: number;
  dayWidthPx: number;
  totalWidthPx: number;
  columns: TimelineColumn[];
  dateToX: (date: Date) => number;
  xToDate: (x: number) => Date;
  todayX: number | null;
}

export function useGanttTimeline(
  issues: Issue[] | undefined,
  sprint: Sprint | null,
  zoom: ZoomLevel,
): UseGanttTimelineReturn {
  return useMemo(() => {
    const dayWidthPx = getDayWidth(zoom);

    // Collect all relevant dates
    const allDates: (Date | null)[] = [];

    if (sprint) {
      allDates.push(safeParseDate(sprint.startDate));
      allDates.push(safeParseDate(sprint.endDate));
    }

    issues?.forEach((issue) => {
      allDates.push(safeParseDate(issue.startDate));
      allDates.push(safeParseDate(issue.endDate));
    });

    const { start: timelineStart, end: timelineEnd } = computeTimelineRange(allDates);
    const totalDays = diffDays(timelineEnd, timelineStart) + 1;
    const totalWidthPx = totalDays * dayWidthPx;

    const columns =
      zoom === 'day'
        ? generateDayColumns(timelineStart, timelineEnd)
        : generateWeekColumns(timelineStart, timelineEnd);

    const today = startOfDay(new Date());
    const todayOffset = diffDays(today, timelineStart);
    const todayX =
      todayOffset >= 0 && todayOffset <= totalDays
        ? todayOffset * dayWidthPx
        : null;

    return {
      timelineStart,
      timelineEnd,
      totalDays,
      dayWidthPx,
      totalWidthPx,
      columns,
      dateToX: (date: Date) => diffDays(startOfDay(date), timelineStart) * dayWidthPx,
      xToDate: (x: number) => addDays(timelineStart, Math.round(x / dayWidthPx)),
      todayX,
    };
  }, [issues, sprint, zoom]);
}
