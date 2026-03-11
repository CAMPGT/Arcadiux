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

export type DeadlineStatus = 'on_time' | 'at_risk' | 'overdue';

export interface DeadlineInfo {
  status: DeadlineStatus;
  label: string;
  color: string;       // hex color (e.g. '#22c55e')
  bgLight: string;     // light bg hex (e.g. '#dcfce7')
  textDark: string;    // dark text hex (e.g. '#15803d')
  daysOverdue: number; // positive when overdue, 0 otherwise
}

const deadlineConfig: Record<DeadlineStatus, Omit<DeadlineInfo, 'status' | 'daysOverdue'>> = {
  on_time: {
    label: 'En tiempo',
    color: '#22c55e',
    bgLight: '#dcfce7',
    textDark: '#15803d',
  },
  at_risk: {
    label: 'Por vencer',
    color: '#eab308',
    bgLight: '#fef9c3',
    textDark: '#a16207',
  },
  overdue: {
    label: 'Retrasado',
    color: '#ef4444',
    bgLight: '#fee2e2',
    textDark: '#b91c1c',
  },
};

/**
 * @param endDate - issue end/due date
 * @param referenceDate - date to compare against (defaults to today).
 *   Pass `updatedAt` for issues in done/cancelled status.
 */
export function getDeadlineStatus(endDate: string | null, referenceDate?: string | null): DeadlineInfo | null {
  if (!endDate) return null;
  const ref = referenceDate ? parseISO(referenceDate) : new Date();
  ref.setHours(0, 0, 0, 0);
  const end = parseISO(endDate);
  end.setHours(0, 0, 0, 0);
  const diffDaysVal = Math.ceil((end.getTime() - ref.getTime()) / (1000 * 60 * 60 * 24));

  let status: DeadlineStatus;
  if (diffDaysVal <= 0) status = 'overdue';
  else if (diffDaysVal <= 3) status = 'at_risk';
  else status = 'on_time';

  const daysOverdue = status === 'overdue' ? Math.abs(diffDaysVal) : 0;

  return { status, ...deadlineConfig[status], daysOverdue };
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
