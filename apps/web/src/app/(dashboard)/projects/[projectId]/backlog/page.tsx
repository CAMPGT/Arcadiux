'use client';

import React, { useMemo, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import type { ApiResponse, Issue, WorkflowStatus, User, Project, Sprint, Responsible } from '@arcadiux/shared/types';
import { apiClient } from '@/lib/api-client';
import { BacklogTable } from '@/components/backlog/backlog-table';
import { EpicAccordion } from '@/components/backlog/epic-accordion';
import { CreateIssueDialog } from '@/components/issue/create-issue-dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

const PAGE_SIZE = 50;

export default function BacklogPage() {
  const params = useParams<{ projectId: string }>();
  const projectId = params?.projectId ?? '';
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [page, setPage] = useState(1);

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

  const projectKey = project?.key ?? '';

  // Use projectId (UUID) directly — RBAC plugin resolves both UUID and key,
  // so we don't need to wait for projectKey to resolve first.
  const { data: backlogResult, isLoading } = useQuery({
    queryKey: ['project', projectId, 'backlog', page],
    queryFn: async () => {
      const res = await apiClient.get<{
        success: boolean;
        data: Issue[];
        pagination: { page: number; pageSize: number; totalItems: number; totalPages: number };
      }>(
        `/api/projects/${projectId}/backlog`,
        { page, pageSize: PAGE_SIZE },
      );
      return res;
    },
    enabled: !!projectId,
  });

  const issues = backlogResult?.data ?? [];
  const pagination = backlogResult?.pagination;

  const { data: statuses } = useQuery({
    queryKey: ['project', projectId, 'statuses'],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<WorkflowStatus[]>>(
        `/api/projects/${projectId}/statuses`,
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

  const { data: membersData } = useQuery({
    queryKey: ['project', projectId, 'members-list'],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<{ user: User }[]>>(
        `/api/projects/${projectId}/members`,
      );
      return res.data.map((m) => m.user);
    },
    enabled: !!projectId,
  });

  const { data: responsiblesData } = useQuery({
    queryKey: ['project', projectId, 'responsibles'],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<Responsible[]>>(
        `/api/projects/${projectId}/responsibles`,
      );
      return res.data;
    },
    enabled: !!projectId,
  });

  const membersMap = useMemo(() => {
    const map: Record<string, User> = {};
    membersData?.forEach((m) => {
      map[m.id] = m;
    });
    return map;
  }, [membersData]);

  const statusesMap = useMemo(() => {
    const map: Record<string, WorkflowStatus> = {};
    statuses?.forEach((s) => {
      map[s.id] = s;
    });
    return map;
  }, [statuses]);

  const sprintsMap = useMemo(() => {
    const map: Record<string, Sprint> = {};
    sprintsData?.forEach((s) => {
      map[s.id] = s;
    });
    return map;
  }, [sprintsData]);

  const responsiblesMap = useMemo(() => {
    const map: Record<string, Responsible> = {};
    responsiblesData?.forEach((r) => {
      map[r.id] = r;
    });
    return map;
  }, [responsiblesData]);

  const epics = useMemo(
    () => issues?.filter((i) => i.type === 'epic') ?? [],
    [issues],
  );

  const nonEpicIssues = useMemo(
    () => issues?.filter((i) => i.type !== 'epic') ?? [],
    [issues],
  );

  const handlePrevPage = useCallback(() => setPage((p) => Math.max(1, p - 1)), []);
  const handleNextPage = useCallback(() => setPage((p) => p + 1), []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Backlog</h2>
          <p className="text-sm text-muted-foreground">
            {pagination?.totalItems ?? issues.length} issues en total
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Crear Issue
        </Button>
      </div>

      <Tabs defaultValue="flat">
        <TabsList>
          <TabsTrigger value="flat">Lista</TabsTrigger>
          <TabsTrigger value="epics">Por Épica</TabsTrigger>
        </TabsList>

        <TabsContent value="flat">
          {isLoading ? (
            <div className="flex items-center justify-center py-20" aria-busy="true">
              <LoadingSpinner />
            </div>
          ) : (
            <>
              <BacklogTable
                issues={issues ?? []}
                projectKey={projectKey}
                members={membersMap}
                statuses={statusesMap}
                sprints={sprintsMap}
                responsibles={responsiblesMap}
              />
              {pagination && pagination.totalPages > 1 && (
                <div className="flex items-center justify-center gap-4 py-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrevPage}
                    disabled={page <= 1}
                  >
                    <ChevronLeft className="mr-1 h-4 w-4" />
                    Anterior
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Página {page} de {pagination.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNextPage}
                    disabled={page >= pagination.totalPages}
                  >
                    Siguiente
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="epics" className="space-y-4">
          {epics.map((epic) => {
            const children = nonEpicIssues.filter(
              (i) => i.epicId === epic.id,
            );
            return (
              <EpicAccordion
                key={epic.id}
                epic={epic}
                children={children}
                projectKey={projectKey}
                members={membersMap}
                statuses={statusesMap}
              />
            );
          })}

          {/* Unassigned to epic */}
          {(() => {
            const orphans = nonEpicIssues.filter((i) => !i.epicId);
            if (orphans.length === 0) return null;
            return (
              <div className="rounded-lg border p-4">
                <h3 className="mb-3 text-sm font-semibold text-muted-foreground">
                  Sin Épica ({orphans.length})
                </h3>
                <BacklogTable
                  issues={orphans}
                  projectKey={projectKey}
                  members={membersMap}
                  statuses={statusesMap}
                  sprints={sprintsMap}
                />
              </div>
            );
          })()}
        </TabsContent>
      </Tabs>

      {/* Create Issue Dialog */}
      <CreateIssueDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        projectId={projectId}
        members={membersData}
        responsibles={responsiblesData}
        sprints={sprintsData}
        epics={epics}
      />
    </div>
  );
}
