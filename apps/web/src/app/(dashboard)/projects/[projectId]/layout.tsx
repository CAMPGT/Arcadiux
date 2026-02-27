'use client';

import React from 'react';
import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { ApiResponse, Project } from '@arcadiux/shared/types';
import { cn } from '@/lib/utils';
import {
  Kanban,
  ListTodo,
  Timer,
  BarChart3,
  MessageSquare,
  Settings,
} from 'lucide-react';

const tabs = [
  { label: 'Board', href: 'board', icon: Kanban },
  { label: 'Backlog', href: 'backlog', icon: ListTodo },
  { label: 'Sprints', href: 'sprints', icon: Timer },
  { label: 'Reports', href: 'reports', icon: BarChart3 },
  { label: 'Retro', href: 'retro', icon: MessageSquare },
  { label: 'Settings', href: 'settings', icon: Settings },
];

export default function ProjectLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams<{ projectId: string }>();
  const pathname = usePathname();

  const { data: project } = useQuery({
    queryKey: ['project', params?.projectId],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<Project>>(
        `/api/projects/${params?.projectId}`,
      );
      return res.data;
    },
    enabled: !!params?.projectId,
  });

  return (
    <div className="space-y-6">
      {/* Project Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {project?.name ?? 'Loading...'}
        </h1>
        {project?.description && (
          <p className="text-sm text-muted-foreground mt-1">
            {project.description}
          </p>
        )}
      </div>

      {/* Tab Navigation */}
      <nav className="flex gap-1 border-b">
        {tabs.map((tab) => {
          const href = `/projects/${params?.projectId}/${tab.href}`;
          const isActive = pathname?.endsWith(tab.href) || pathname?.includes(`/${tab.href}/`);

          return (
            <Link
              key={tab.href}
              href={href}
              className={cn(
                'flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </Link>
          );
        })}
      </nav>

      {/* Page Content */}
      {children}
    </div>
  );
}
