'use client';

import React, { useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ApiResponse, Sprint, Issue, WorkflowStatus, User, Project } from '@arcadiux/shared/types';
import type { CreateSprintInput } from '@arcadiux/shared/validators';
import type { IssueType, PriorityLevel } from '@arcadiux/shared/constants';
import { apiClient } from '@/lib/api-client';
import { getIssueKey, cn } from '@/lib/utils';
import { SprintCard } from '@/components/sprint/sprint-card';
import { SprintDialog } from '@/components/sprint/sprint-dialog';
import { PriorityIcon } from '@/components/shared/priority-icon';
import { StatusBadge } from '@/components/shared/status-badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Plus,
  Pencil,
  X,
  ChevronDown,
  ChevronRight,
  Zap,
  BookOpen,
  CheckSquare,
  GitBranch,
  Bug,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

const typeIcons: Record<IssueType, React.ElementType> = {
  epic: Zap,
  story: BookOpen,
  task: CheckSquare,
  subtask: GitBranch,
  bug: Bug,
};

const typeColors: Record<IssueType, string> = {
  epic: 'text-violet-600',
  story: 'text-green-600',
  task: 'text-blue-600',
  subtask: 'text-cyan-600',
  bug: 'text-red-600',
};

export default function SprintsPage() {
  const params = useParams<{ projectId: string }>();
  const projectId = params?.projectId ?? '';
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSprint, setEditingSprint] = useState<Sprint | null>(null);
  const [expandedSprintId, setExpandedSprintId] = useState<string | null>(null);
  const [addIssuesSprintId, setAddIssuesSprintId] = useState<string | null>(null);
  const [selectedIssueIds, setSelectedIssueIds] = useState<Set<string>>(new Set());

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

  const { data: sprints, isLoading } = useQuery({
    queryKey: ['project', projectId, 'sprints'],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<Sprint[]>>(
        `/api/projects/${projectId}/sprints`,
      );
      return res.data;
    },
    enabled: !!projectId,
  });

  const { data: issues } = useQuery({
    queryKey: ['project', projectId, 'issues'],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<Issue[]>>(
        `/api/projects/${projectId}/issues`,
      );
      return res.data;
    },
    enabled: !!projectId,
  });

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

  const statusesMap = useMemo(() => {
    const map: Record<string, WorkflowStatus> = {};
    statuses?.forEach((s) => { map[s.id] = s; });
    return map;
  }, [statuses]);

  const doneStatusIds = useMemo(
    () =>
      new Set(
        statuses?.filter((s) => s.category === 'done').map((s) => s.id) ?? [],
      ),
    [statuses],
  );

  // Issues sin sprint asignado (backlog disponible)
  const backlogIssues = useMemo(
    () => issues?.filter((i) => !i.sprintId) ?? [],
    [issues],
  );

  const getSprintIssues = (sprintId: string) =>
    issues?.filter((i) => i.sprintId === sprintId) ?? [];

  // --- Mutations ---

  const createSprintMutation = useMutation({
    mutationFn: async (data: CreateSprintInput) => {
      return apiClient.post<ApiResponse<Sprint>>(
        `/api/projects/${projectId}/sprints`,
        data,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId, 'sprints'] });
      toast.success('Sprint creado exitosamente');
    },
    onError: () => { toast.error('Error al crear el sprint'); },
  });

  const updateSprintMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: CreateSprintInput }) => {
      return apiClient.patch<ApiResponse<Sprint>>(
        `/api/projects/${projectId}/sprints/${id}`,
        data,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId, 'sprints'] });
      toast.success('Sprint actualizado exitosamente');
    },
    onError: () => { toast.error('Error al actualizar el sprint'); },
  });

  const startSprintMutation = useMutation({
    mutationFn: async (sprintId: string) => {
      return apiClient.post<ApiResponse<Sprint>>(
        `/api/projects/${projectId}/sprints/${sprintId}/start`,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId, 'sprints'] });
      toast.success('Sprint iniciado');
    },
    onError: () => { toast.error('Error al iniciar el sprint'); },
  });

  const completeSprintMutation = useMutation({
    mutationFn: async (sprintId: string) => {
      return apiClient.post<ApiResponse<Sprint>>(
        `/api/projects/${projectId}/sprints/${sprintId}/complete`,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId, 'sprints'] });
      toast.success('Sprint completado');
    },
    onError: () => { toast.error('Error al completar el sprint'); },
  });

  const assignIssueMutation = useMutation({
    mutationFn: async ({ issueId, sprintId }: { issueId: string; sprintId: string | null }) => {
      return apiClient.patch<ApiResponse<Issue>>(
        `/api/projects/${projectId}/issues/${issueId}`,
        { sprintId },
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId, 'issues'] });
    },
  });

  // --- Handlers ---

  const handleSubmit = (data: CreateSprintInput) => {
    if (editingSprint) {
      updateSprintMutation.mutate({ id: editingSprint.id, data });
    } else {
      createSprintMutation.mutate(data);
    }
    setEditingSprint(null);
  };

  const handleRemoveIssue = (issueId: string) => {
    assignIssueMutation.mutate(
      { issueId, sprintId: null },
      {
        onSuccess: () => toast.success('Issue removido del sprint'),
        onError: () => toast.error('Error al remover issue'),
      },
    );
  };

  const handleAddSelectedIssues = () => {
    if (!addIssuesSprintId || selectedIssueIds.size === 0) return;
    const promises = Array.from(selectedIssueIds).map((issueId) =>
      apiClient.patch<ApiResponse<Issue>>(
        `/api/projects/${projectId}/issues/${issueId}`,
        { sprintId: addIssuesSprintId },
      ),
    );
    Promise.all(promises)
      .then(() => {
        queryClient.invalidateQueries({ queryKey: ['project', projectId, 'issues'] });
        toast.success(`${selectedIssueIds.size} issue(s) agregados al sprint`);
        setSelectedIssueIds(new Set());
        setAddIssuesSprintId(null);
      })
      .catch(() => toast.error('Error al agregar issues'));
  };

  const toggleIssueSelection = (id: string) => {
    setSelectedIssueIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleExpand = (sprintId: string) => {
    setExpandedSprintId((prev) => (prev === sprintId ? null : sprintId));
  };

  const getSprintMetrics = (sprint: Sprint) => {
    const sprintIssues = getSprintIssues(sprint.id);
    const completedIssues = sprintIssues.filter((i) => doneStatusIds.has(i.statusId));
    const totalPoints = sprintIssues.reduce((sum, i) => sum + (i.storyPoints ?? 0), 0);
    const completedPoints = completedIssues.reduce((sum, i) => sum + (i.storyPoints ?? 0), 0);
    return {
      issueCount: sprintIssues.length,
      completedCount: completedIssues.length,
      totalPoints,
      completedPoints,
    };
  };

  const activeSprints = sprints?.filter((s) => s.status === 'active') ?? [];
  const plannedSprints = sprints?.filter((s) => s.status === 'planned') ?? [];
  const completedSprints = sprints?.filter((s) => s.status === 'completed') ?? [];

  // --- Issue list renderer ---

  const renderSprintIssues = (sprint: Sprint, showActions: boolean) => {
    const sprintIssues = getSprintIssues(sprint.id);
    const isExpanded = expandedSprintId === sprint.id;

    return (
      <>
        <button
          onClick={() => toggleExpand(sprint.id)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors px-1"
        >
          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          <span>{sprintIssues.length} issues en este sprint</span>
        </button>

        {isExpanded && (
          <div className="rounded-md border bg-background">
            {sprintIssues.length > 0 ? (
              <div className="divide-y">
                {sprintIssues.map((issue) => {
                  const TypeIcon = typeIcons[issue.type as IssueType] ?? CheckSquare;
                  const status = statusesMap[issue.statusId];
                  return (
                    <div
                      key={issue.id}
                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50 transition-colors"
                    >
                      <TypeIcon className={cn('h-4 w-4 shrink-0', typeColors[issue.type as IssueType])} />
                      <span className="text-xs font-medium text-muted-foreground shrink-0">
                        {getIssueKey(project?.key ?? '', issue.issueNumber)}
                      </span>
                      <span className="text-sm flex-1 truncate">{issue.title}</span>
                      {status && (
                        <StatusBadge name={status.name} category={status.category} />
                      )}
                      <PriorityIcon priority={issue.priority as PriorityLevel} />
                      {issue.storyPoints !== null && (
                        <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold shrink-0">
                          {issue.storyPoints} pts
                        </span>
                      )}
                      {showActions && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                          onClick={() => handleRemoveIssue(issue.id)}
                          disabled={assignIssueMutation.isPending}
                          title="Quitar del sprint"
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                No hay issues en este sprint.
              </p>
            )}

            {showActions && (
              <div className="border-t px-4 py-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedIssueIds(new Set());
                    setAddIssuesSprintId(sprint.id);
                  }}
                >
                  <Plus className="mr-2 h-3.5 w-3.5" />
                  Agregar Issues del Backlog
                </Button>
              </div>
            )}
          </div>
        )}
      </>
    );
  };

  // --- Render sprint block ---

  const renderSprintBlock = (sprint: Sprint, actions: React.ReactNode, showIssueActions: boolean) => {
    const metrics = getSprintMetrics(sprint);
    return (
      <div key={sprint.id} className="space-y-3">
        <div className="flex items-start gap-2">
          <div className="flex-1">
            <SprintCard sprint={sprint} {...metrics} />
          </div>
          {showIssueActions && (
            <Button
              variant="ghost"
              size="icon"
              className="mt-2 h-8 w-8 shrink-0"
              onClick={() => {
                setEditingSprint(sprint);
                setDialogOpen(true);
              }}
              title="Editar sprint"
            >
              <Pencil className="h-4 w-4" />
            </Button>
          )}
        </div>
        {renderSprintIssues(sprint, showIssueActions)}
        {actions}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Sprints</h2>
          <p className="text-sm text-muted-foreground">
            {sprints?.length ?? 0} sprints en total
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingSprint(null);
            setDialogOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Crear Sprint
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : (
        <Tabs defaultValue="planned">
          <TabsList>
            <TabsTrigger value="active">
              Activo ({activeSprints.length})
            </TabsTrigger>
            <TabsTrigger value="planned">
              Planificado ({plannedSprints.length})
            </TabsTrigger>
            <TabsTrigger value="completed">
              Completado ({completedSprints.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-6">
            {activeSprints.length > 0 ? (
              activeSprints.map((sprint) =>
                renderSprintBlock(
                  sprint,
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => completeSprintMutation.mutate(sprint.id)}
                      disabled={completeSprintMutation.isPending}
                    >
                      Completar Sprint
                    </Button>
                  </div>,
                  true,
                ),
              )
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No hay sprints activos. Inicia un sprint planificado o crea uno nuevo.
              </p>
            )}
          </TabsContent>

          <TabsContent value="planned" className="space-y-6">
            {plannedSprints.length > 0 ? (
              plannedSprints.map((sprint) =>
                renderSprintBlock(
                  sprint,
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => startSprintMutation.mutate(sprint.id)}
                    disabled={startSprintMutation.isPending}
                  >
                    Iniciar Sprint
                  </Button>,
                  true,
                ),
              )
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No hay sprints planificados. Crea uno para comenzar a planificar.
              </p>
            )}
          </TabsContent>

          <TabsContent value="completed" className="space-y-6">
            {completedSprints.length > 0 ? (
              completedSprints.map((sprint) =>
                renderSprintBlock(sprint, null, false),
              )
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Aún no hay sprints completados.
              </p>
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* Sprint Create/Edit Dialog */}
      <SprintDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        sprint={editingSprint}
        isLoading={createSprintMutation.isPending || updateSprintMutation.isPending}
      />

      {/* Add Issues Dialog */}
      <Dialog
        open={!!addIssuesSprintId}
        onOpenChange={(open) => {
          if (!open) {
            setAddIssuesSprintId(null);
            setSelectedIssueIds(new Set());
          }
        }}
      >
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Agregar Issues al Sprint</DialogTitle>
            <DialogDescription>
              Selecciona los issues del backlog que quieres incluir en este sprint.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto border rounded-md">
            {backlogIssues.length > 0 ? (
              <div className="divide-y">
                {backlogIssues.map((issue) => {
                  const TypeIcon = typeIcons[issue.type as IssueType] ?? CheckSquare;
                  const status = statusesMap[issue.statusId];
                  const isSelected = selectedIssueIds.has(issue.id);
                  return (
                    <label
                      key={issue.id}
                      className={cn(
                        'flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors',
                        isSelected && 'bg-primary/5',
                      )}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleIssueSelection(issue.id)}
                      />
                      <TypeIcon className={cn('h-4 w-4 shrink-0', typeColors[issue.type as IssueType])} />
                      <span className="text-xs font-medium text-muted-foreground shrink-0">
                        {getIssueKey(project?.key ?? '', issue.issueNumber)}
                      </span>
                      <span className="text-sm flex-1 truncate">{issue.title}</span>
                      {status && (
                        <StatusBadge name={status.name} category={status.category} />
                      )}
                      <PriorityIcon priority={issue.priority as PriorityLevel} />
                      {issue.storyPoints !== null && (
                        <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold shrink-0">
                          {issue.storyPoints}
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>
            ) : (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                No hay issues disponibles en el backlog. Todos los issues ya están asignados a un sprint.
              </p>
            )}
          </div>

          <DialogFooter>
            <div className="flex items-center justify-between w-full">
              <span className="text-sm text-muted-foreground">
                {selectedIssueIds.size} seleccionados
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setAddIssuesSprintId(null);
                    setSelectedIssueIds(new Set());
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleAddSelectedIssues}
                  disabled={selectedIssueIds.size === 0}
                >
                  Agregar al Sprint
                </Button>
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
