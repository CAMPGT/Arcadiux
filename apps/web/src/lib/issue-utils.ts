import {
  Zap,
  BookOpen,
  CheckSquare,
  GitBranch,
  Bug,
} from 'lucide-react';
import type { IssueType } from '@arcadiux/shared/constants';

export const typeIcons: Record<IssueType, React.ElementType> = {
  epic: Zap,
  story: BookOpen,
  task: CheckSquare,
  subtask: GitBranch,
  bug: Bug,
};

export const typeColors: Record<IssueType, string> = {
  epic: 'text-violet-600 dark:text-violet-400',
  story: 'text-green-600 dark:text-green-400',
  task: 'text-blue-600 dark:text-blue-400',
  subtask: 'text-cyan-600 dark:text-cyan-400',
  bug: 'text-red-600 dark:text-red-400',
};
