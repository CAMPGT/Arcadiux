import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, formatDistanceToNow } from 'date-fns';
import type { PriorityLevel, IssueType, StatusCategory } from '@arcadiux/shared/constants';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date, formatStr: string = 'MMM d, yyyy'): string {
  return format(new Date(date), formatStr);
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
    todo: 'text-gray-600 bg-gray-100 border-gray-300',
    in_progress: 'text-blue-600 bg-blue-50 border-blue-200',
    done: 'text-green-600 bg-green-50 border-green-200',
  };
  return colors[category];
}
