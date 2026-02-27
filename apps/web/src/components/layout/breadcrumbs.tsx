'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { ApiResponse, Project } from '@arcadiux/shared/types';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BreadcrumbItem {
  label: string;
  href: string;
}

const LABEL_MAP: Record<string, string> = {
  projects: 'Proyectos',
  board: 'Tablero',
  backlog: 'Backlog',
  sprints: 'Sprints',
  reports: 'Reportes',
  retro: 'Retrospectiva',
  settings: 'Configuración',
  new: 'Nuevo',
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function extractProjectId(pathname: string): string | null {
  const segments = pathname.split('/').filter(Boolean);
  const projIdx = segments.indexOf('projects');
  if (projIdx !== -1 && projIdx + 1 < segments.length) {
    const candidate = segments[projIdx + 1];
    if (UUID_RE.test(candidate)) return candidate;
  }
  return null;
}

function buildBreadcrumbs(
  pathname: string,
  projectName: string | null,
): BreadcrumbItem[] {
  const segments = pathname.split('/').filter(Boolean);
  const breadcrumbs: BreadcrumbItem[] = [];
  let currentPath = '';

  for (const segment of segments) {
    currentPath += `/${segment}`;
    if (UUID_RE.test(segment)) {
      if (projectName) {
        breadcrumbs.push({ label: projectName, href: currentPath });
      }
      continue;
    }
    const label = LABEL_MAP[segment] ?? decodeURIComponent(segment);
    breadcrumbs.push({ label, href: currentPath });
  }

  return breadcrumbs;
}

export function Breadcrumbs() {
  const pathname = usePathname();
  const projectId = extractProjectId(pathname ?? '');

  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<Project>>(
        `/api/projects/${projectId}`,
      );
      return res.data;
    },
    enabled: !!projectId,
  });

  const breadcrumbs = buildBreadcrumbs(
    pathname ?? '',
    project?.name ?? null,
  );

  if (breadcrumbs.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm">
      <Link
        href="/projects"
        className="flex items-center text-muted-foreground hover:text-foreground transition-colors"
      >
        <Home className="h-4 w-4" />
      </Link>

      {breadcrumbs.map((item, index) => {
        const isLast = index === breadcrumbs.length - 1;
        return (
          <React.Fragment key={item.href}>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            {isLast ? (
              <span className="font-medium text-foreground">{item.label}</span>
            ) : (
              <Link
                href={item.href}
                className={cn(
                  'text-muted-foreground hover:text-foreground transition-colors',
                )}
              >
                {item.label}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
