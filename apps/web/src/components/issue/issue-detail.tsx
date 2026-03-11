'use client';

import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { updateIssueSchema, type UpdateIssueInput, type UpdateIssueFormData } from '@arcadiux/shared/validators';
import { IssueType, IssueCategory, IssueCategoryLabels, PriorityLevel, PriorityLevelLabels, STORY_POINT_OPTIONS } from '@arcadiux/shared/constants';
import type { ApiResponse, Issue, User, WorkflowStatus, Sprint, Responsible, Attachment } from '@arcadiux/shared/types';
import { apiClient } from '@/lib/api-client';
import { format, parseISO } from 'date-fns';
import { formatRelativeDate, getIssueKey, cn } from '@/lib/utils';
import { PriorityIcon } from '@/components/shared/priority-icon';
import { StatusBadge } from '@/components/shared/status-badge';
import { AvatarDisplay } from '@/components/shared/avatar-display';
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  CheckSquare,
  Pencil,
  X,
  Save,
  Loader2,
  Paperclip,
  Trash2,
  Download,
  FileIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { typeIcons, typeColors } from '@/lib/issue-utils';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

interface IssueDetailProps {
  issueId: string;
  projectId: string;
  projectKey: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

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

  // Attachments
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: attachmentsList } = useQuery({
    queryKey: ['issue', issueId, 'attachments'],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<Attachment[]>>(
        `/api/projects/${projectId}/issues/${issue?.issueNumber}/attachments`,
      );
      return res.data;
    },
    enabled: !!issueId && !!issue?.issueNumber && open,
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      return apiClient.upload<ApiResponse<Attachment>>(
        `/api/projects/${projectId}/issues/${issue?.issueNumber}/attachments`,
        file,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issue', issueId, 'attachments'] });
      toast.success('Archivo adjuntado');
    },
    onError: () => {
      toast.error('Error al subir archivo');
    },
  });

  const deleteAttachmentMutation = useMutation({
    mutationFn: async (attachmentId: string) => {
      return apiClient.delete(
        `/api/projects/${projectId}/issues/${issue?.issueNumber}/attachments/${attachmentId}`,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issue', issueId, 'attachments'] });
      toast.success('Archivo eliminado');
    },
    onError: () => {
      toast.error('Error al eliminar archivo');
    },
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    for (let i = 0; i < files.length; i++) {
      uploadMutation.mutate(files[i]);
    }
    e.target.value = '';
  };

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<UpdateIssueFormData>({
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
        responsibleIds: issue.responsibleIds ?? [],
        sprintId: issue.sprintId ?? undefined,
        storyPoints: issue.storyPoints ?? undefined,
        startDate: issue.startDate ?? undefined,
        endDate: issue.endDate ?? undefined,
        category: issue.category as UpdateIssueInput['category'],
      });
      setIsEditing(true);
    }
  };

  const onSubmit = (data: UpdateIssueFormData) => {
    updateMutation.mutate(data as UpdateIssueInput);
  };

  if (isLoading || !issue) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Cargando...</DialogTitle>
            <DialogDescription>Por favor espera mientras cargamos los detalles del issue.</DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center py-12" aria-busy="true">
            <LoadingSpinner />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const TypeIcon = typeIcons[issue.type] ?? CheckSquare;
  const currentStatus = statuses?.find((s) => s.id === issue.statusId);
  const assignee = members?.find((m) => m.id === issue.assigneeId);
  const issueResponsibles = responsiblesList?.filter((r) => issue.responsibleIds?.includes(r.id)) ?? [];
  const reporter = members?.find((m) => m.id === issue.reporterId);
  const currentSprint = sprints?.find((s) => s.id === issue.sprintId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(
        "max-w-3xl max-h-[85vh] overflow-y-auto",
        isEditing && "max-w-2xl p-5 gap-3"
      )}>
        <DialogHeader className={cn(isEditing && "space-y-1")}>
          <div className="flex items-center gap-2">
            <TypeIcon className={cn('h-5 w-5', typeColors[issue.type])} />
            <span className="text-sm font-medium text-muted-foreground">
              {getIssueKey(projectKey, issue.issueNumber)}
            </span>
            <div className="flex-1 flex justify-center">
              {!isEditing ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1.5 text-xs text-muted-foreground"
                  onClick={startEditing}
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Editar
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1.5 text-xs text-muted-foreground"
                  onClick={() => setIsEditing(false)}
                >
                  <X className="h-3.5 w-3.5" />
                  Cancelar edición
                </Button>
              )}
            </div>
          </div>
          <DialogTitle className="sr-only">
            {getIssueKey(projectKey, issue.issueNumber)} - {issue.title}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Detalles del issue {getIssueKey(projectKey, issue.issueNumber)}
          </DialogDescription>
        </DialogHeader>

        {isEditing ? (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-2.5">
            <div className="space-y-1">
              <Label className="text-xs">Título</Label>
              <Input className="h-8 text-sm" {...register('title')} />
              {errors.title && (
                <p className="text-xs text-destructive">{errors.title.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Descripción</Label>
              <Textarea
                className="text-sm min-h-0"
                rows={2}
                {...register('description')}
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Tipo</Label>
                <Select
                  defaultValue={issue.type}
                  onValueChange={(v) => setValue('type', v as UpdateIssueInput['type'])}
                >
                  <SelectTrigger className="h-8 text-xs">
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

              <div className="space-y-1">
                <Label className="text-xs">Prioridad</Label>
                <Select
                  defaultValue={issue.priority}
                  onValueChange={(v) => setValue('priority', v as UpdateIssueInput['priority'])}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(PriorityLevel).map((priority) => (
                      <SelectItem key={priority} value={priority}>
                        {PriorityLevelLabels[priority]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Categoría</Label>
                <Select
                  defaultValue={issue.category}
                  onValueChange={(v) => setValue('category', v as UpdateIssueInput['category'])}
                >
                  <SelectTrigger className="h-8 text-xs">
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

              <div className="space-y-1">
                <Label className="text-xs">Asignado</Label>
                <Select
                  defaultValue={issue.assigneeId ?? 'unassigned'}
                  onValueChange={(v) =>
                    setValue('assigneeId', v === 'unassigned' ? undefined : v)
                  }
                >
                  <SelectTrigger className="h-8 text-xs">
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

              <div className="space-y-1">
                <Label className="text-xs">Responsables</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="h-8 w-full justify-start text-xs font-normal">
                      {(() => {
                        const ids = watch('responsibleIds') ?? [];
                        if (ids.length === 0) return <span className="text-muted-foreground">Sin responsables</span>;
                        const names = ids.map((id) => responsiblesList?.find((r) => r.id === id)?.fullName).filter(Boolean);
                        return <span className="truncate">{names.join(', ')}</span>;
                      })()}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56 p-2" align="start">
                    {responsiblesList?.map((resp) => {
                      const currentIds = watch('responsibleIds') ?? [];
                      const checked = currentIds.includes(resp.id);
                      return (
                        <label key={resp.id} className="flex items-center gap-2 rounded px-2 py-1.5 text-xs hover:bg-muted cursor-pointer">
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(v) => {
                              const next = v
                                ? [...currentIds, resp.id]
                                : currentIds.filter((id) => id !== resp.id);
                              setValue('responsibleIds', next, { shouldDirty: true });
                            }}
                          />
                          {resp.fullName}
                        </label>
                      );
                    })}
                    {(!responsiblesList || responsiblesList.length === 0) && (
                      <p className="px-2 py-3 text-xs text-muted-foreground text-center">No hay responsables creados</p>
                    )}
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Story Points</Label>
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
                  <SelectTrigger className="h-8 text-xs">
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

              <div className="space-y-1">
                <Label className="text-xs">Sprint</Label>
                <Select
                  defaultValue={issue.sprintId ?? 'none'}
                  onValueChange={(v) =>
                    setValue('sprintId', v === 'none' ? null : v)
                  }
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Sin sprint" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin sprint</SelectItem>
                    {sprints
                      ?.filter((s) => s.status === 'active' || s.status === 'planned')
                      .map((sprint) => (
                        <SelectItem key={sprint.id} value={sprint.id}>
                          {sprint.name}
                          {sprint.status === 'active' ? ' (Activo)' : ''}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Fecha de Inicio</Label>
                <Input className="h-8 text-xs" type="date" {...register('startDate')} />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Fecha Final</Label>
                <Input className="h-8 text-xs" type="date" {...register('endDate')} />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" size="sm" disabled={updateMutation.isPending}>
                <Save className="mr-1.5 h-3.5 w-3.5" />
                {updateMutation.isPending ? 'Guardando...' : 'Guardar'}
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
                <p className="text-muted-foreground">Responsables</p>
                {issueResponsibles.length > 0 ? (
                  <div className="mt-1 space-y-0.5">
                    {issueResponsibles.map((r) => (
                      <div key={r.id}>
                        <span className="text-sm font-medium">{r.fullName}</span>
                        {r.jobTitle && (
                          <span className="text-xs text-muted-foreground ml-1">({r.jobTitle})</span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className="text-muted-foreground">Sin responsables</span>
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

            {/* Attachments */}
            <Separator />
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold flex items-center gap-1.5">
                  <Paperclip className="h-3.5 w-3.5" />
                  Adjuntos ({attachmentsList?.length ?? 0})
                </h4>
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={handleFileUpload}
                    aria-label="Seleccionar archivos para adjuntar"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadMutation.isPending}
                  >
                    {uploadMutation.isPending ? (
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Paperclip className="mr-1.5 h-3.5 w-3.5" />
                    )}
                    Adjuntar
                  </Button>
                </div>
              </div>

              {attachmentsList && attachmentsList.length > 0 ? (
                <div className="space-y-2">
                  {attachmentsList.map((att) => (
                    <div key={att.id} className="flex items-center gap-3 rounded-md border px-3 py-2">
                      <FileIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{att.fileName}</p>
                        <p className="text-xs text-muted-foreground">
                          {att.fileSize < 1024
                            ? `${att.fileSize} B`
                            : att.fileSize < 1024 * 1024
                            ? `${(att.fileSize / 1024).toFixed(1)} KB`
                            : `${(att.fileSize / (1024 * 1024)).toFixed(1)} MB`}
                        </p>
                      </div>
                      <a
                        href={att.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        download={att.fileName}
                      >
                        <Button variant="ghost" size="icon" className="h-7 w-7" aria-label={`Descargar ${att.fileName}`}>
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                      </a>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => deleteAttachmentMutation.mutate(att.id)}
                        disabled={deleteAttachmentMutation.isPending}
                        aria-label={`Eliminar ${att.fileName}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-3">
                  Sin archivos adjuntos.
                </p>
              )}
            </div>

          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
