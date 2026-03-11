'use client';

import React from 'react';
import type { LifecycleReport } from '@arcadiux/shared/types';
import { typeIcons, typeColors } from '@/lib/issue-utils';
import type { IssueType } from '@arcadiux/shared/constants';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface LifecycleTableProps {
  data: LifecycleReport;
}

const categoryColors: Record<string, string> = {
  todo: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
  in_progress: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  done: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
};

export function LifecycleTable({ data }: LifecycleTableProps) {
  if (data.issues.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">
          No hay issues en este sprint.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          Ciclo de Vida &mdash; {data.sprintName}
        </CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="whitespace-nowrap px-4 py-2 text-left font-medium">
                Issue
              </th>
              {data.statuses.map((col) => (
                <th
                  key={col.statusId}
                  className="whitespace-nowrap px-3 py-2 text-center font-medium"
                >
                  <span
                    className={cn(
                      'inline-block rounded px-2 py-0.5 text-xs font-medium',
                      categoryColors[col.category] ?? 'bg-gray-100 text-gray-700',
                    )}
                  >
                    {col.statusName}
                  </span>
                </th>
              ))}
              <th className="whitespace-nowrap px-3 py-2 text-center font-medium">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {data.issues.map((issue) => {
              const Icon = typeIcons[issue.type as IssueType];
              const colorClass = typeColors[issue.type as IssueType] ?? 'text-gray-500';
              const durationMap = new Map(
                issue.durations.map((d) => [d.statusId, d]),
              );

              return (
                <tr key={issue.issueId} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="whitespace-nowrap px-4 py-2">
                    <div className="flex items-center gap-2">
                      {Icon && <Icon className={cn('h-4 w-4 shrink-0', colorClass)} />}
                      <span className="font-mono text-xs text-muted-foreground">
                        {issue.issueKey}
                      </span>
                      <span className="max-w-[200px] truncate" title={issue.title}>
                        {issue.title}
                      </span>
                    </div>
                  </td>
                  {data.statuses.map((col) => {
                    const dur = durationMap.get(col.statusId);
                    return (
                      <td
                        key={col.statusId}
                        className="whitespace-nowrap px-3 py-2 text-center font-mono text-xs"
                      >
                        {dur ? dur.formatted : <span className="text-muted-foreground">&mdash;</span>}
                      </td>
                    );
                  })}
                  <td className="whitespace-nowrap px-3 py-2 text-center font-mono text-xs font-semibold">
                    {issue.totalFormatted}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
