'use client';

import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core';
import { apiClient } from '@/lib/api-client';
import type { ApiResponse, Issue, WorkflowStatus, User, Project, Sprint, Responsible } from '@arcadiux/shared/types';
import { IssueType, PriorityLevel } from '@arcadiux/shared/constants';
import { BoardColumn } from '@/components/board/board-column';
import { BoardCard } from '@/components/board/board-card';
import { useBoardFilters } from '@/stores/use-board-filters';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Sparkles, Filter, X } from 'lucide-react';
import { AiPanel } from '@/components/ai/ai-panel';
import { useIssueModal } from '@/stores/use-issue-modal';
import { IssueDetail } from '@/components/issue/issue-detail';
import { toast } from 'sonner';

export default function BoardPage() {
  const params = useParams<{ projectId: string }>();
  const projectId = params?.projectId ?? '';
  const queryClient = useQueryClient();
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const { isOpen: issueModalOpen, selectedIssueId, closeIssue } = useIssueModal();
  const [activeIssue, setActiveIssue] = useState<Issue | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
  );

  const {
    sprintFilter,
    assigneeFilter,
    typeFilter,
    priorityFilter,
    searchText,
    setSprintFilter,
    setAssigneeFilter,
    setTypeFilter,
    setPriorityFilter,
    setSearchText,
    clearFilters,
  } = useBoardFilters();

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

  const { data: statuses, isLoading: statusesLoading } = useQuery({
    queryKey: ['project', projectId, 'statuses'],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<WorkflowStatus[]>>(
        `/api/projects/${projectId}/statuses`,
      );
      return res.data;
    },
    enabled: !!projectId,
  });

  const { data: issues, isLoading: issuesLoading } = useQuery({
    queryKey: ['project', projectId, 'issues'],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<Issue[]>>(
        `/api/projects/${projectId}/issues`,
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

  const moveIssueMutation = useMutation({
    mutationFn: async ({ issueId, statusId, position }: { issueId: string; statusId: string; position: number }) => {
      return apiClient.patch<ApiResponse<Issue>>(
        `/api/projects/${projectId}/issues/${issueId}`,
        { statusId, position },
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['project', projectId, 'issues'],
      });
    },
    onError: () => {
      queryClient.invalidateQueries({
        queryKey: ['project', projectId, 'issues'],
      });
      toast.error('Error al mover el issue');
    },
  });

  // Auto-seleccionar el sprint activo al cargar o al cambiar de proyecto
  const activeSprint = useMemo(
    () => sprintsData?.find((s) => s.status === 'active') ?? null,
    [sprintsData],
  );

  // Reset filters when project changes
  useEffect(() => {
    clearFilters();
  }, [projectId, clearFilters]);

  useEffect(() => {
    if (activeSprint && !sprintFilter) {
      setSprintFilter(activeSprint.id);
    }
  }, [activeSprint, sprintFilter, setSprintFilter]);

  const membersMap = useMemo(() => {
    const map: Record<string, User> = {};
    membersData?.forEach((m) => {
      map[m.id] = m;
    });
    return map;
  }, [membersData]);

  const responsiblesMap = useMemo(() => {
    const map: Record<string, Responsible> = {};
    responsiblesData?.forEach((r) => {
      map[r.id] = r;
    });
    return map;
  }, [responsiblesData]);

  const activeSprintName = useMemo(() => {
    if (!sprintFilter || !sprintsData) return null;
    return sprintsData.find((s) => s.id === sprintFilter)?.name ?? null;
  }, [sprintFilter, sprintsData]);

  const filteredIssues = useMemo(() => {
    if (!issues) return [];
    return issues.filter((issue) => {
      if (sprintFilter && issue.sprintId !== sprintFilter) return false;
      if (assigneeFilter && issue.assigneeId !== assigneeFilter) return false;
      if (typeFilter && issue.type !== typeFilter) return false;
      if (priorityFilter && issue.priority !== priorityFilter) return false;
      if (
        searchText &&
        !issue.title.toLowerCase().includes(searchText.toLowerCase())
      )
        return false;
      return true;
    });
  }, [issues, sprintFilter, assigneeFilter, typeFilter, priorityFilter, searchText]);

  const sortedStatuses = useMemo(() => {
    if (!statuses) return [];
    return [...statuses]
      .filter((s) => s.isActive !== false)
      .sort((a, b) => a.position - b.position);
  }, [statuses]);

  const hasFilters = sprintFilter || assigneeFilter || typeFilter || priorityFilter || searchText;
  const isLoading = statusesLoading || issuesLoading;

  // Sprints disponibles para el filtro (activos y planificados)
  const filterableSprints = useMemo(
    () => sprintsData?.filter((s) => s.status === 'active' || s.status === 'planned') ?? [],
    [sprintsData],
  );

  // --- DnD handlers ---

  const findColumnForIssue = useCallback(
    (issueId: string): string | null => {
      const issue = filteredIssues.find((i) => i.id === issueId);
      return issue?.statusId ?? null;
    },
    [filteredIssues],
  );

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const { active } = event;
      const issue = filteredIssues.find((i) => i.id === active.id);
      if (issue) setActiveIssue(issue);
    },
    [filteredIssues],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveIssue(null);
      const { active, over } = event;
      if (!over || !active) return;

      const issueId = active.id as string;
      let targetStatusId: string | null = null;

      // Determine target status: dropped on a column or on another issue
      if (over.data.current?.type === 'column') {
        targetStatusId = over.data.current.statusId;
      } else if (over.data.current?.type === 'issue') {
        targetStatusId = findColumnForIssue(over.id as string);
      } else {
        // Fallback: over.id might be "column-<statusId>"
        const overId = over.id as string;
        if (overId.startsWith('column-')) {
          targetStatusId = overId.replace('column-', '');
        }
      }

      if (!targetStatusId) return;

      const currentStatusId = findColumnForIssue(issueId);
      if (currentStatusId === targetStatusId && active.id === over.id) return;

      // Calculate new position
      const targetColumnIssues = filteredIssues
        .filter((i) => i.statusId === targetStatusId && i.id !== issueId)
        .sort((a, b) => a.position - b.position);

      let newPosition = 0;
      if (over.data.current?.type === 'issue' && over.id !== active.id) {
        const overIndex = targetColumnIssues.findIndex((i) => i.id === over.id);
        newPosition = overIndex >= 0 ? overIndex : targetColumnIssues.length;
      } else {
        newPosition = targetColumnIssues.length;
      }

      // Optimistic update
      queryClient.setQueryData(
        ['project', projectId, 'issues'],
        (old: Issue[] | undefined) => {
          if (!old) return old;
          return old.map((i) =>
            i.id === issueId
              ? { ...i, statusId: targetStatusId!, position: newPosition }
              : i,
          );
        },
      );

      moveIssueMutation.mutate({
        issueId,
        statusId: targetStatusId,
        position: newPosition,
      });
    },
    [filteredIssues, findColumnForIssue, moveIssueMutation, projectId, queryClient],
  );

  return (
    <div className="space-y-4">
      {/* Sprint indicator */}
      {activeSprintName && (
        <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-4 py-2">
          <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
          <span className="text-sm font-medium">Sprint activo: {activeSprintName}</span>
        </div>
      )}

      {/* Filter Bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <Filter className="h-4 w-4" />
          Filtros:
        </div>
        <Select
          value={sprintFilter ?? 'all'}
          onValueChange={(v) =>
            setSprintFilter(v === 'all' ? null : v)
          }
        >
          <SelectTrigger className="h-9 w-44">
            <SelectValue placeholder="Sprint" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los issues</SelectItem>
            {filterableSprints.map((sprint) => (
              <SelectItem key={sprint.id} value={sprint.id}>
                {sprint.name} {sprint.status === 'active' ? '(Activo)' : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          placeholder="Buscar issues..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className="h-9 w-48"
        />
        <Select
          value={typeFilter ?? 'all'}
          onValueChange={(v) =>
            setTypeFilter(v === 'all' ? null : (v as IssueType))
          }
        >
          <SelectTrigger className="h-9 w-36">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los tipos</SelectItem>
            {Object.values(IssueType).map((type) => (
              <SelectItem key={type} value={type}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={priorityFilter ?? 'all'}
          onValueChange={(v) =>
            setPriorityFilter(v === 'all' ? null : (v as PriorityLevel))
          }
        >
          <SelectTrigger className="h-9 w-36">
            <SelectValue placeholder="Prioridad" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las prioridades</SelectItem>
            {Object.values(PriorityLevel).map((p) => (
              <SelectItem key={p} value={p}>
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={assigneeFilter ?? 'all'}
          onValueChange={(v) =>
            setAssigneeFilter(v === 'all' ? null : v)
          }
        >
          <SelectTrigger className="h-9 w-40">
            <SelectValue placeholder="Asignado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {membersData?.map((member) => (
              <SelectItem key={member.id} value={member.id}>
                {member.fullName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="h-9"
          >
            <X className="mr-1 h-3.5 w-3.5" />
            Limpiar
          </Button>
        )}
        <div className="ml-auto">
          <Button
            variant="outline"
            size="sm"
            className="h-9"
            onClick={() => setAiPanelOpen(true)}
          >
            <Sparkles className="mr-2 h-4 w-4" />
            AI
          </Button>
        </div>
      </div>

      {/* Board */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 overflow-x-auto pb-4">
            {sortedStatuses.map((status) => {
              const columnIssues = filteredIssues
                .filter((issue) => issue.statusId === status.id)
                .sort((a, b) => a.position - b.position);

              return (
                <BoardColumn
                  key={status.id}
                  status={status}
                  issues={columnIssues}
                  projectKey={project?.key ?? ''}
                  members={membersMap}
                  responsibles={responsiblesMap}
                />
              );
            })}
          </div>

          <DragOverlay>
            {activeIssue ? (
              <div className="w-72 rotate-3 opacity-90">
                <BoardCard
                  issue={activeIssue}
                  projectKey={project?.key ?? ''}
                  assignee={
                    activeIssue.assigneeId
                      ? membersMap[activeIssue.assigneeId]
                      : null
                  }
                  responsibleName={
                    activeIssue.responsibleId
                      ? responsiblesMap[activeIssue.responsibleId]?.fullName
                      : null
                  }
                />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {/* AI Panel */}
      <AiPanel
        projectId={projectId}
        open={aiPanelOpen}
        onClose={() => setAiPanelOpen(false)}
      />

      {/* Issue Detail */}
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
