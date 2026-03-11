import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import type { PriorityLevel, IssueType, StatusCategory } from '@arcadiux/shared/constants';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date, formatStr: string = 'MMM d, yyyy'): string {
  // Use parseISO for date strings to avoid timezone shift.
  // new Date("2026-02-22") is parsed as UTC midnight, which shifts to the
  // previous day in timezones behind UTC. parseISO treats it as local midnight.
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, formatStr);
}

export function formatRelativeDate(date: string | Date): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

export function getIssueKey(projectKey: string, issueNumber: number): string {
  return `${projectKey}-${issueNumber}`;
}

export function getPriorityColor(priority: PriorityLevel): string {
  const colors: Record<PriorityLevel, string> = {
    critical: 'text-red-600 bg-red-50 border-red-200',
    high: 'text-orange-600 bg-orange-50 border-orange-200',
    medium: 'text-yellow-600 bg-yellow-50 border-yellow-200',
    low: 'text-green-600 bg-green-50 border-green-200',
  };
  return colors[priority];
}

export function getIssueTypeColor(type: IssueType): string {
  const colors: Record<IssueType, string> = {
    epic: 'text-violet-600 bg-violet-50 border-violet-200',
    story: 'text-green-600 bg-green-50 border-green-200',
    task: 'text-blue-600 bg-blue-50 border-blue-200',
    subtask: 'text-cyan-600 bg-cyan-50 border-cyan-200',
    bug: 'text-red-600 bg-red-50 border-red-200',
  };
  return colors[type];
}

export function getStatusCategoryColor(category: StatusCategory): string {
  const colors: Record<StatusCategory, string> = {
    todo: 'text-gray-600 bg-gray-100 border-gray-300 dark:text-gray-400 dark:bg-gray-800 dark:border-gray-700',
    in_progress: 'text-blue-600 bg-blue-50 border-blue-200 dark:text-blue-400 dark:bg-blue-900/30 dark:border-blue-800',
    done: 'text-green-600 bg-green-50 border-green-200 dark:text-green-400 dark:bg-green-900/30 dark:border-green-800',
  };
  return colors[category];
}
