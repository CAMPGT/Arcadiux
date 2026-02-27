'use client';

import React, { useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createIssueSchema, type CreateIssueInput } from '@arcadiux/shared/validators';
import { IssueType, IssueCategory, IssueCategoryLabels, PriorityLevel, STORY_POINT_OPTIONS } from '@arcadiux/shared/constants';
import type { ApiResponse, Issue, WorkflowStatus, User, Project, Sprint, Responsible } from '@arcadiux/shared/types';
import { apiClient } from '@/lib/api-client';
import { BacklogTable } from '@/components/backlog/backlog-table';
import { EpicAccordion } from '@/components/backlog/epic-accordion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function BacklogPage() {
  const params = useParams<{ projectId: string }>();
  const projectId = params?.projectId ?? '';
  const queryClient = useQueryClient();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

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

  const { data: issues, isLoading } = useQuery({
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

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    reset,
  } = useForm<CreateIssueInput>({
    resolver: zodResolver(createIssueSchema),
    defaultValues: {
      type: IssueType.STORY,
      title: '',
      description: '',
      priority: PriorityLevel.MEDIUM,
    },
  });

  const createIssueMutation = useMutation({
    mutationFn: async (data: CreateIssueInput) => {
      return apiClient.post<ApiResponse<Issue>>(
        `/api/projects/${projectId}/issues`,
        data,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['project', projectId, 'issues'],
      });
      toast.success('Issue creado exitosamente');
      reset();
      setCreateDialogOpen(false);
    },
    onError: () => {
      toast.error('Error al crear el issue');
    },
  });

  const onSubmit = (data: CreateIssueInput) => {
    createIssueMutation.mutate(data);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Backlog</h2>
          <p className="text-sm text-muted-foreground">
            {issues?.length ?? 0} issues en total
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
            <div className="flex items-center justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : (
            <BacklogTable
              issues={issues ?? []}
              projectKey={project?.key ?? ''}
              members={membersMap}
              statuses={statusesMap}
              sprints={sprintsMap}
              responsibles={responsiblesMap}
            />
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
                projectKey={project?.key ?? ''}
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
                  projectKey={project?.key ?? ''}
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
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Crear Issue</DialogTitle>
            <DialogDescription>
              Agrega un nuevo issue al backlog.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select
                  defaultValue={IssueType.STORY}
                  onValueChange={(v) =>
                    setValue('type', v as CreateIssueInput['type'])
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(IssueType).map((type) => (
                      <SelectItem key={type} value={type}>
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Prioridad</Label>
                <Select
                  defaultValue={PriorityLevel.MEDIUM}
                  onValueChange={(v) =>
                    setValue('priority', v as CreateIssueInput['priority'])
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(PriorityLevel).map((p) => (
                      <SelectItem key={p} value={p}>
                        {p.charAt(0).toUpperCase() + p.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Título</Label>
              <Input
                placeholder="Título del issue"
                {...register('title')}
              />
              {errors.title && (
                <p className="text-xs text-destructive">
                  {errors.title.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Descripción (opcional)</Label>
              <Textarea
                placeholder="Describe el issue..."
                rows={4}
                {...register('description')}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Asignado</Label>
                <Select
                  onValueChange={(v) =>
                    setValue('assigneeId', v === 'none' ? undefined : v)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sin asignar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin asignar</SelectItem>
                    {membersData?.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.fullName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Responsable</Label>
                <Select
                  onValueChange={(v) =>
                    setValue('responsibleId', v === 'none' ? undefined : v)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sin responsable" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin responsable</SelectItem>
                    {responsiblesData?.map((resp) => (
                      <SelectItem key={resp.id} value={resp.id}>
                        {resp.fullName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Puntos de Historia</Label>
                <Select
                  onValueChange={(v) =>
                    setValue(
                      'storyPoints',
                      v === 'none' ? undefined : Number(v),
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Ninguno" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Ninguno</SelectItem>
                    {STORY_POINT_OPTIONS.map((sp) => (
                      <SelectItem key={sp} value={String(sp)}>
                        {sp}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Categoría</Label>
              <Select
                defaultValue={IssueCategory.OTHERS}
                onValueChange={(v) =>
                  setValue('category', v as CreateIssueInput['category'])
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(IssueCategory).map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {IssueCategoryLabels[cat]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Fecha de Inicio</Label>
                <Input type="date" {...register('startDate')} />
              </div>
              <div className="space-y-2">
                <Label>Fecha Final</Label>
                <Input type="date" {...register('endDate')} />
              </div>
            </div>

            {epics.length > 0 && (
              <div className="space-y-2">
                <Label>Épica (opcional)</Label>
                <Select
                  onValueChange={(v) =>
                    setValue('epicId', v === 'none' ? undefined : v)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sin épica" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin épica</SelectItem>
                    {epics.map((epic) => (
                      <SelectItem key={epic.id} value={epic.id}>
                        {epic.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={createIssueMutation.isPending}
              >
                {createIssueMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Crear
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
