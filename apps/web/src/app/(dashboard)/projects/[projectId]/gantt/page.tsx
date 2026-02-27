'use client';

import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { apiClient } from '@/lib/api-client';
import type { ApiResponse, Issue, Project, Sprint } from '@arcadiux/shared/types';
import { GanttChart } from '@/components/gantt/gantt-chart';
import { useIssueModal } from '@/stores/use-issue-modal';
import { IssueDetail } from '@/components/issue/issue-detail';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CalendarRange, ListTodo } from 'lucide-react';
import { toast } from 'sonner';
import type { ZoomLevel } from '@/lib/gantt-utils';
import Link from 'next/link';

export default function GanttPage() {
  const params = useParams<{ projectId: string }>();
  const projectId = params?.projectId ?? '';
  const queryClient = useQueryClient();
  const { isOpen: issueModalOpen, selectedIssueId, openIssue, closeIssue } = useIssueModal();

  const [sprintFilter, setSprintFilter] = useState<string | null>(null);
  const [zoom, setZoom] = useState<ZoomLevel>('day');

  // ─── Queries ───────────────────────────────────────────────────────────────

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

  const { data: sprintsData } = useQuery({
    queryKey: ['project', projectId, 'sprints'],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<Sprint[]>>(
        `/api/projects/${projectId}/sprints`,
      );
      return res.data;
    },
    enabled: !!projectId,
  });

  const { data: issues, isLoading: issuesLoading } = useQuery({
    queryKey: ['project', projectId, 'issues', { sprintId: sprintFilter }],
    queryFn: async () => {
      const url = sprintFilter
        ? `/api/projects/${projectId}/issues?sprintId=${sprintFilter}`
        : `/api/projects/${projectId}/issues`;
      const res = await apiClient.get<ApiResponse<Issue[]>>(url);
      return res.data;
    },
    enabled: !!projectId,
  });

  // ─── Auto-select active sprint ─────────────────────────────────────────────

  const activeSprint = useMemo(
    () => sprintsData?.find((s) => s.status === 'active') ?? null,
    [sprintsData],
  );

  useEffect(() => {
    if (activeSprint && !sprintFilter) {
      setSprintFilter(activeSprint.id);
    }
  }, [activeSprint, sprintFilter]);

  const selectedSprint = useMemo(
    () => sprintsData?.find((s) => s.id === sprintFilter) ?? null,
    [sprintsData, sprintFilter],
  );

  const filterableSprints = useMemo(
    () =>
      sprintsData?.filter(
        (s) => s.status === 'active' || s.status === 'planned',
      ) ?? [],
    [sprintsData],
  );

  // ─── Resize mutation ──────────────────────────────────────────────────────

  const resizeMutation = useMutation({
    mutationFn: async ({
      issueId,
      startDate,
      endDate,
    }: {
      issueId: string;
      startDate: string;
      endDate: string;
    }) => {
      return apiClient.patch<ApiResponse<Issue>>(
        `/api/projects/${projectId}/issues/${issueId}`,
        { startDate, endDate },
      );
    },
    onMutate: async ({ issueId, startDate, endDate }) => {
      const queryKey = ['project', projectId, 'issues', { sprintId: sprintFilter }];
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<Issue[]>(queryKey);
      queryClient.setQueryData<Issue[]>(queryKey, (old) =>
        old?.map((i) =>
          i.id === issueId ? { ...i, startDate, endDate } : i,
        ),
      );
      return { previous, queryKey };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(context.queryKey, context.previous);
      }
      toast.error('Error al actualizar las fechas');
    },
    onSuccess: () => {
      toast.success('Fechas actualizadas');
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ['project', projectId, 'issues'],
      });
    },
  });

  const handleResize = useCallback(
    (issueId: string, newStart: Date, newEnd: Date) => {
      resizeMutation.mutate({
        issueId,
        startDate: format(newStart, 'yyyy-MM-dd'),
        endDate: format(newEnd, 'yyyy-MM-dd'),
      });
    },
    [resizeMutation],
  );

  // ─── Empty state check ────────────────────────────────────────────────────

  const noIssues = !issuesLoading && (!issues || issues.length === 0);

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CalendarRange className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-lg font-semibold">Gantt</h1>
          {selectedSprint && (
            <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              {selectedSprint.name}
              {selectedSprint.status === 'active' ? ' (Activo)' : ''}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Sprint selector */}
          <Select
            value={sprintFilter ?? 'all'}
            onValueChange={(v) => setSprintFilter(v === 'all' ? null : v)}
          >
            <SelectTrigger className="h-9 w-44">
              <SelectValue placeholder="Sprint" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los issues</SelectItem>
              {filterableSprints.map((sprint) => (
                <SelectItem key={sprint.id} value={sprint.id}>
                  {sprint.name}{' '}
                  {sprint.status === 'active' ? '(Activo)' : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Zoom toggle */}
          <div className="flex rounded-md border">
            <Button
              variant={zoom === 'day' ? 'default' : 'ghost'}
              size="sm"
              className="h-9 rounded-r-none"
              onClick={() => setZoom('day')}
            >
              Día
            </Button>
            <Button
              variant={zoom === 'week' ? 'default' : 'ghost'}
              size="sm"
              className="h-9 rounded-l-none"
              onClick={() => setZoom('week')}
            >
              Semana
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      {issuesLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : noIssues ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border bg-muted/30 py-20">
          <ListTodo className="h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            No hay issues en este sprint.
          </p>
          <Link href={`/projects/${projectId}/backlog`}>
            <Button variant="outline" size="sm">
              Ir al Backlog
            </Button>
          </Link>
        </div>
      ) : (
        <GanttChart
          issues={issues ?? []}
          sprint={selectedSprint}
          projectKey={project?.key ?? ''}
          zoom={zoom}
          onResize={handleResize}
          onIssueClick={openIssue}
        />
      )}

      {/* Issue Detail Modal */}
      {selectedIssueId && (
        <IssueDetail
          issueId={selectedIssueId}
          projectId={projectId}
          projectKey={project?.key ?? ''}
          open={issueModalOpen}
          onOpenChange={(open) => {
            if (!open) closeIssue();
          }}
        />
      )}
    </div>
  );
}
