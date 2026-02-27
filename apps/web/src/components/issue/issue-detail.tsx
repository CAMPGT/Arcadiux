'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { updateIssueSchema, type UpdateIssueInput } from '@arcadiux/shared/validators';
import { IssueType, IssueCategory, IssueCategoryLabels, PriorityLevel, STORY_POINT_OPTIONS } from '@arcadiux/shared/constants';
import type { ApiResponse, Issue, User, WorkflowStatus, Sprint, Responsible } from '@arcadiux/shared/types';
import { apiClient } from '@/lib/api-client';
import { format, parseISO } from 'date-fns';
import { formatRelativeDate, getIssueKey, cn } from '@/lib/utils';
import { PriorityIcon } from '@/components/shared/priority-icon';
import { StatusBadge } from '@/components/shared/status-badge';
import { AvatarDisplay } from '@/components/shared/avatar-display';
import { CommentThread } from './comment-thread';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Zap,
  BookOpen,
  CheckSquare,
  GitBranch,
  Bug,
  Pencil,
  X,
  Save,
} from 'lucide-react';
import { toast } from 'sonner';

interface IssueDetailProps {
  issueId: string;
  projectId: string;
  projectKey: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const typeIcons: Record<string, React.ElementType> = {
  epic: Zap,
  story: BookOpen,
  task: CheckSquare,
  subtask: GitBranch,
  bug: Bug,
};

const typeColors: Record<string, string> = {
  epic: 'text-violet-600',
  story: 'text-green-600',
  task: 'text-blue-600',
  subtask: 'text-cyan-600',
  bug: 'text-red-600',
};

export function IssueDetail({
  issueId,
  projectId,
  projectKey,
  open,
  onOpenChange,
}: IssueDetailProps) {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);

  const { data: issue, isLoading } = useQuery({
    queryKey: ['issue', issueId],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<Issue>>(
        `/api/projects/${projectId}/issues/${issueId}`,
      );
      return res.data;
    },
    enabled: !!issueId && open,
  });

  const { data: statuses } = useQuery({
    queryKey: ['project', projectId, 'statuses'],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<WorkflowStatus[]>>(
        `/api/projects/${projectId}/statuses`,
      );
      return res.data;
    },
    enabled: !!projectId && open,
  });

  const { data: members } = useQuery({
    queryKey: ['project', projectId, 'members-users'],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<{ user: User }[]>>(
        `/api/projects/${projectId}/members`,
      );
      return res.data.map((m) => m.user);
    },
    enabled: !!projectId && open,
  });

  const { data: sprints } = useQuery({
    queryKey: ['project', projectId, 'sprints'],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<Sprint[]>>(
        `/api/projects/${projectId}/sprints`,
      );
      return res.data;
    },
    enabled: !!projectId && open,
  });

  const { data: responsiblesList } = useQuery({
    queryKey: ['project', projectId, 'responsibles'],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<Responsible[]>>(
        `/api/projects/${projectId}/responsibles`,
      );
      return res.data;
    },
    enabled: !!projectId && open,
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<UpdateIssueInput>({
    resolver: zodResolver(updateIssueSchema),
  });

  const updateMutation = useMutation({
    mutationFn: async (data: UpdateIssueInput) => {
      return apiClient.patch<ApiResponse<Issue>>(
        `/api/projects/${projectId}/issues/${issueId}`,
        data,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issue', issueId] });
      queryClient.invalidateQueries({ queryKey: ['project', projectId, 'issues'] });
      setIsEditing(false);
      toast.success('Issue actualizado correctamente');
    },
    onError: () => {
      toast.error('Error al actualizar el issue');
    },
  });

  const transitionMutation = useMutation({
    mutationFn: async (statusId: string) => {
      return apiClient.post<ApiResponse<Issue>>(
        `/api/projects/${projectId}/issues/${issueId}/transitions`,
        { statusId },
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issue', issueId] });
      queryClient.invalidateQueries({ queryKey: ['project', projectId, 'issues'] });
      toast.success('Estado actualizado');
    },
    onError: () => {
      toast.error('Error al actualizar el estado');
    },
  });

  const startEditing = () => {
    if (issue) {
      reset({
        title: issue.title,
        description: issue.description ?? undefined,
        type: issue.type as UpdateIssueInput['type'],
        priority: issue.priority as UpdateIssueInput['priority'],
        assigneeId: issue.assigneeId ?? undefined,
        responsibleId: issue.responsibleId ?? undefined,
        sprintId: issue.sprintId ?? undefined,
        storyPoints: issue.storyPoints ?? undefined,
        startDate: issue.startDate ?? undefined,
        endDate: issue.endDate ?? undefined,
        category: issue.category as UpdateIssueInput['category'],
      });
      setIsEditing(true);
    }
  };

  const onSubmit = (data: UpdateIssueInput) => {
    updateMutation.mutate(data);
  };

  if (isLoading || !issue) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Cargando...</DialogTitle>
            <DialogDescription>Por favor espera mientras cargamos los detalles del issue.</DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const TypeIcon = typeIcons[issue.type] ?? CheckSquare;
  const currentStatus = statuses?.find((s) => s.id === issue.statusId);
  const assignee = members?.find((m) => m.id === issue.assigneeId);
  const responsible = responsiblesList?.find((r) => r.id === issue.responsibleId);
  const reporter = members?.find((m) => m.id === issue.reporterId);
  const currentSprint = sprints?.find((s) => s.id === issue.sprintId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <TypeIcon className={cn('h-5 w-5', typeColors[issue.type])} />
            <span className="text-sm font-medium text-muted-foreground">
              {getIssueKey(projectKey, issue.issueNumber)}
            </span>
            {!isEditing && (
              <Button
                variant="ghost"
                size="icon"
                className="ml-auto h-8 w-8"
                onClick={startEditing}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            )}
            {isEditing && (
              <Button
                variant="ghost"
                size="icon"
                className="ml-auto h-8 w-8"
                onClick={() => setIsEditing(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          <DialogTitle className="sr-only">
            {getIssueKey(projectKey, issue.issueNumber)} - {issue.title}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Detalles del issue {getIssueKey(projectKey, issue.issueNumber)}
          </DialogDescription>
        </DialogHeader>

        {isEditing ? (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label>Título</Label>
              <Input {...register('title')} />
              {errors.title && (
                <p className="text-xs text-destructive">{errors.title.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Descripción</Label>
              <Textarea
                rows={6}
                {...register('description')}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select
                  defaultValue={issue.type}
                  onValueChange={(v) => setValue('type', v as UpdateIssueInput['type'])}
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
                  defaultValue={issue.priority}
                  onValueChange={(v) => setValue('priority', v as UpdateIssueInput['priority'])}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(PriorityLevel).map((priority) => (
                      <SelectItem key={priority} value={priority}>
                        {priority.charAt(0).toUpperCase() + priority.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Asignado</Label>
                <Select
                  defaultValue={issue.assigneeId ?? 'unassigned'}
                  onValueChange={(v) =>
                    setValue('assigneeId', v === 'unassigned' ? undefined : v)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sin asignar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Sin asignar</SelectItem>
                    {members?.map((member) => (
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
                  defaultValue={issue.responsibleId ?? 'unassigned'}
                  onValueChange={(v) =>
                    setValue('responsibleId', v === 'unassigned' ? undefined : v)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sin responsable" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Sin responsable</SelectItem>
                    {responsiblesList?.map((resp) => (
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
                  defaultValue={
                    issue.storyPoints !== null
                      ? String(issue.storyPoints)
                      : 'none'
                  }
                  onValueChange={(v) =>
                    setValue('storyPoints', v === 'none' ? undefined : Number(v))
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

              <div className="space-y-2">
                <Label>Sprint</Label>
                <Select
                  defaultValue={issue.sprintId ?? 'none'}
                  onValueChange={(v) =>
                    setValue('sprintId', v === 'none' ? undefined : v)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sin sprint" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin sprint</SelectItem>
                    {sprints?.map((sprint) => (
                      <SelectItem key={sprint.id} value={sprint.id}>
                        {sprint.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Categoría</Label>
                <Select
                  defaultValue={issue.category}
                  onValueChange={(v) => setValue('category', v as UpdateIssueInput['category'])}
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

              <div className="space-y-2">
                <Label>Fecha de Inicio</Label>
                <Input type="date" {...register('startDate')} />
              </div>

              <div className="space-y-2">
                <Label>Fecha Final</Label>
                <Input type="date" {...register('endDate')} />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditing(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                <Save className="mr-2 h-4 w-4" />
                {updateMutation.isPending ? 'Guardando...' : 'Guardar Cambios'}
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-6">
            {/* Title */}
            <h2 className="text-xl font-semibold">{issue.title}</h2>

            {/* Status transition */}
            {statuses && statuses.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                {statuses.map((status) => (
                  <Button
                    key={status.id}
                    variant={
                      status.id === issue.statusId ? 'default' : 'outline'
                    }
                    size="sm"
                    onClick={() => {
                      if (status.id !== issue.statusId) {
                        transitionMutation.mutate(status.id);
                      }
                    }}
                    disabled={transitionMutation.isPending}
                  >
                    {status.name}
                  </Button>
                ))}
              </div>
            )}

            {/* Description */}
            <div>
              <h4 className="mb-2 text-sm font-semibold">Descripción</h4>
              {issue.description ? (
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {issue.description}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  Sin descripción.
                </p>
              )}
            </div>

            <Separator />

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Estado</p>
                {currentStatus && (
                  <StatusBadge
                    name={currentStatus.name}
                    category={currentStatus.category}
                  />
                )}
              </div>
              <div>
                <p className="text-muted-foreground">Prioridad</p>
                <PriorityIcon
                  priority={issue.priority as PriorityLevel}
                  showLabel
                />
              </div>
              <div>
                <p className="text-muted-foreground">Asignado</p>
                {assignee ? (
                  <div className="flex items-center gap-2 mt-1">
                    <AvatarDisplay
                      fullName={assignee.fullName}
                      avatarUrl={assignee.avatarUrl}
                      size="sm"
                    />
                    <span>{assignee.fullName}</span>
                  </div>
                ) : (
                  <span className="text-muted-foreground">Sin asignar</span>
                )}
              </div>
              <div>
                <p className="text-muted-foreground">Responsable</p>
                {responsible ? (
                  <div className="mt-1">
                    <span className="text-sm font-medium">{responsible.fullName}</span>
                    {responsible.jobTitle && (
                      <p className="text-xs text-muted-foreground">{responsible.jobTitle}</p>
                    )}
                  </div>
                ) : (
                  <span className="text-muted-foreground">Sin responsable</span>
                )}
              </div>
              <div>
                <p className="text-muted-foreground">Reportador</p>
                {reporter ? (
                  <div className="flex items-center gap-2 mt-1">
                    <AvatarDisplay
                      fullName={reporter.fullName}
                      avatarUrl={reporter.avatarUrl}
                      size="sm"
                    />
                    <span>{reporter.fullName}</span>
                  </div>
                ) : (
                  <span className="text-muted-foreground">Desconocido</span>
                )}
              </div>
              <div>
                <p className="text-muted-foreground">Sprint</p>
                <span>
                  {currentSprint ? currentSprint.name : 'Sin sprint'}
                </span>
              </div>
              <div>
                <p className="text-muted-foreground">Puntos de Historia</p>
                <span>
                  {issue.storyPoints !== null ? issue.storyPoints : '--'}
                </span>
              </div>
              <div>
                <p className="text-muted-foreground">Categoría</p>
                <span>
                  {IssueCategoryLabels[issue.category as IssueCategory] ?? issue.category ?? '--'}
                </span>
              </div>
              <div>
                <p className="text-muted-foreground">Fecha de Inicio</p>
                <span>
                  {issue.startDate
                    ? format(parseISO(issue.startDate), 'dd/MM/yyyy')
                    : '--'}
                </span>
              </div>
              <div>
                <p className="text-muted-foreground">Fecha Final</p>
                <span>
                  {issue.endDate
                    ? format(parseISO(issue.endDate), 'dd/MM/yyyy')
                    : '--'}
                </span>
              </div>
              <div>
                <p className="text-muted-foreground">Creado</p>
                <span>{formatRelativeDate(issue.createdAt)}</span>
              </div>
              <div>
                <p className="text-muted-foreground">Actualizado</p>
                <span>{formatRelativeDate(issue.updatedAt)}</span>
              </div>
            </div>

            <Separator />

            {/* Comments */}
            <CommentThread
              issueId={issue.id}
              projectId={projectId}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
