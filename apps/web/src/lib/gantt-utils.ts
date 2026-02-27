import {
  differenceInDays,
  addDays,
  format,
  isWeekend,
  eachDayOfInterval,
  eachWeekOfInterval,
  startOfDay,
  min as minDate,
  max as maxDate,
  parseISO,
  clamp,
} from 'date-fns';
import { es } from 'date-fns/locale';

export type ZoomLevel = 'day' | 'week';

export interface TimelineColumn {
  date: Date;
  label: string;
  isWeekend: boolean;
  isToday: boolean;
}

export const DAY_WIDTH_DAY_ZOOM = 48;
export const DAY_WIDTH_WEEK_ZOOM = 17;

export function getDayWidth(zoom: ZoomLevel): number {
  return zoom === 'day' ? DAY_WIDTH_DAY_ZOOM : DAY_WIDTH_WEEK_ZOOM;
}

export function diffDays(a: Date, b: Date): number {
  return differenceInDays(a, b);
}

export function getBarStyle(
  startDate: Date,
  endDate: Date,
  timelineStart: Date,
  dayWidthPx: number,
): { left: number; width: number } {
  const left = diffDays(startOfDay(startDate), startOfDay(timelineStart)) * dayWidthPx;
  const duration = Math.max(diffDays(startOfDay(endDate), startOfDay(startDate)) + 1, 1);
  const width = duration * dayWidthPx;
  return { left, width };
}

export function clampDate(date: Date, minD: Date, maxD: Date): Date {
  return clamp(date, { start: minD, end: maxD });
}

export function formatColumnLabel(date: Date, zoom: ZoomLevel): string {
  if (zoom === 'day') {
    const dayName = format(date, 'EEE', { locale: es });
    const dayNum = format(date, 'd');
    return `${dayName.charAt(0).toUpperCase() + dayName.slice(1)} ${dayNum}`;
  }
  // Week zoom: "Sem N"
  const weekNum = format(date, 'w');
  return `Sem ${weekNum}`;
}

export function isWeekendDay(date: Date): boolean {
  return isWeekend(date);
}

export function generateDayColumns(start: Date, end: Date): TimelineColumn[] {
  const today = startOfDay(new Date());
  return eachDayOfInterval({ start, end }).map((date) => ({
    date,
    label: formatColumnLabel(date, 'day'),
    isWeekend: isWeekendDay(date),
    isToday: date.getTime() === today.getTime(),
  }));
}

export function generateWeekColumns(start: Date, end: Date): TimelineColumn[] {
  const today = startOfDay(new Date());
  return eachWeekOfInterval({ start, end }, { weekStartsOn: 1 }).map((date) => ({
    date,
    label: formatColumnLabel(date, 'week'),
    isWeekend: false,
    isToday: date.getTime() === today.getTime(),
  }));
}

export function dateToX(date: Date, timelineStart: Date, dayWidthPx: number): number {
  return diffDays(startOfDay(date), startOfDay(timelineStart)) * dayWidthPx;
}

export function xToDate(x: number, timelineStart: Date, dayWidthPx: number): Date {
  const days = Math.round(x / dayWidthPx);
  return addDays(timelineStart, days);
}

export function safeParseDate(dateStr: string | null): Date | null {
  if (!dateStr) return null;
  try {
    return parseISO(dateStr);
  } catch {
    return null;
  }
}

export function computeTimelineRange(
  dates: (Date | null)[],
  paddingDays: number = 3,
): { start: Date; end: Date } {
  const validDates = dates.filter((d): d is Date => d !== null);

  if (validDates.length === 0) {
    const today = startOfDay(new Date());
    return {
      start: addDays(today, -7),
      end: addDays(today, 21),
    };
  }

  const earliest = minDate(validDates);
  const latest = maxDate(validDates);

  return {
    start: addDays(startOfDay(earliest), -paddingDays),
    end: addDays(startOfDay(latest), paddingDays),
  };
}
