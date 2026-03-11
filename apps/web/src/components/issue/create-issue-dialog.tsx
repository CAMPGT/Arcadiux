'use client';

import React, { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createIssueSchema,
  type CreateIssueInput,
  type CreateIssueFormData,
} from '@arcadiux/shared/validators';
import {
  IssueType,
  IssueCategory,
  IssueCategoryLabels,
  PriorityLevel,
  PriorityLevelLabels,
  STORY_POINT_OPTIONS,
} from '@arcadiux/shared/constants';
import type { ApiResponse, Issue, User, Sprint, Responsible } from '@arcadiux/shared/types';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Paperclip, X } from 'lucide-react';
import { toast } from 'sonner';

interface CreateIssueDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  defaultSprintId?: string | null;
  defaultStatusId?: string | null;
  members?: User[];
  responsibles?: Responsible[];
  sprints?: Sprint[];
  epics?: Issue[];
}

export function CreateIssueDialog({
  open,
  onOpenChange,
  projectId,
  defaultSprintId,
  defaultStatusId,
  members,
  responsibles,
  sprints,
  epics,
}: CreateIssueDialogProps) {
  const queryClient = useQueryClient();
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<CreateIssueFormData>({
    resolver: zodResolver(createIssueSchema) as any,
    defaultValues: {
      type: IssueType.STORY,
      title: '',
      description: '',
      priority: PriorityLevel.MEDIUM,
    },
  });

  const createIssueMutation = useMutation({
    mutationFn: async (data: CreateIssueInput) => {
      const res = await apiClient.post<ApiResponse<Issue>>(
        `/api/projects/${projectId}/issues`,
        data,
      );

      // If a specific status was requested, patch the issue to move it
      if (defaultStatusId && res.data) {
        await apiClient.patch<ApiResponse<Issue>>(
          `/api/projects/${projectId}/issues/${res.data.id}`,
          { statusId: defaultStatusId },
        );
      }

      // Upload pending files
      if (pendingFiles.length > 0 && res.data) {
        const issueNumber = res.data.issueNumber;
        await Promise.all(
          pendingFiles.map((file) =>
            apiClient.upload(
              `/api/projects/${projectId}/issues/${issueNumber}/attachments`,
              file,
            ).catch(() => { /* best effort — issue already created */ }),
          ),
        );
      }

      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['project', projectId, 'issues'],
      });
      toast.success('Issue creado exitosamente');
      reset();
      setPendingFiles([]);
      onOpenChange(false);
    },
    onError: () => {
      toast.error('Error al crear el issue');
    },
  });

  const onSubmit = (data: CreateIssueFormData) => {
    // Pre-fill sprintId from the default if user didn't pick one
    const payload = { ...data } as CreateIssueInput;
    if (!payload.sprintId && defaultSprintId) {
      payload.sprintId = defaultSprintId;
    }
    createIssueMutation.mutate(payload);
  };

  // Reset form when dialog opens
  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      reset({
        type: IssueType.STORY,
        title: '',
        description: '',
        priority: PriorityLevel.MEDIUM,
      });
      setPendingFiles([]);
    }
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[480px] max-h-[85vh] overflow-y-auto p-5 gap-3">
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-base">Crear Issue</DialogTitle>
          <DialogDescription className="text-xs">
            Agrega un nuevo issue{defaultStatusId ? ' al tablero' : ' al backlog'}.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-2.5">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Tipo</Label>
              <Select
                defaultValue={IssueType.STORY}
                onValueChange={(v) =>
                  setValue('type', v as CreateIssueInput['type'])
                }
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
                defaultValue={PriorityLevel.MEDIUM}
                onValueChange={(v) =>
                  setValue('priority', v as CreateIssueInput['priority'])
                }
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(PriorityLevel).map((p) => (
                    <SelectItem key={p} value={p}>
                      {PriorityLevelLabels[p]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Título *</Label>
            <Input
              className="h-8 text-sm"
              placeholder="Título del issue"
              {...register('title')}
            />
            {errors.title && (
              <p className="text-xs text-destructive">
                {errors.title.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Asignado</Label>
              <Select
                onValueChange={(v) =>
                  setValue('assigneeId', v === 'none' ? undefined : v)
                }
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Sin asignar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin asignar</SelectItem>
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
                      const names = ids.map((id) => responsibles?.find((r) => r.id === id)?.fullName).filter(Boolean);
                      return <span className="truncate">{names.join(', ')}</span>;
                    })()}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-2" align="start">
                  {responsibles?.map((resp) => {
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
                  {(!responsibles || responsibles.length === 0) && (
                    <p className="px-2 py-3 text-xs text-muted-foreground text-center">No hay responsables creados</p>
                  )}
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Story Points</Label>
              <Select
                onValueChange={(v) =>
                  setValue(
                    'storyPoints',
                    v === 'none' ? undefined : Number(v),
                  )
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
              <Label className="text-xs">Categoría</Label>
              <Select
                defaultValue={IssueCategory.OTHERS}
                onValueChange={(v) =>
                  setValue('category', v as CreateIssueInput['category'])
                }
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
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Fecha de Inicio</Label>
              <Input className="h-8 text-xs" type="date" {...register('startDate')} />
              {errors.startDate && (
                <p className="text-xs text-destructive">
                  {errors.startDate.message}
                </p>
              )}
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Fecha Final</Label>
              <Input className="h-8 text-xs" type="date" {...register('endDate')} />
              {errors.endDate && (
                <p className="text-xs text-destructive">
                  {errors.endDate.message}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {sprints && sprints.length > 0 && (
              <div className="space-y-1">
                <Label className="text-xs">Sprint</Label>
                <Select
                  defaultValue={defaultSprintId ?? undefined}
                  onValueChange={(v) =>
                    setValue('sprintId', v === 'none' ? undefined : v)
                  }
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Sin sprint" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin sprint</SelectItem>
                    {sprints.map((sprint) => (
                      <SelectItem key={sprint.id} value={sprint.id}>
                        {sprint.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {epics && epics.length > 0 && (
              <div className="space-y-1">
                <Label className="text-xs">Épica</Label>
                <Select
                  onValueChange={(v) =>
                    setValue('epicId', v === 'none' ? undefined : v)
                  }
                >
                  <SelectTrigger className="h-8 text-xs">
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
          </div>

          {/* Attachments */}
          <div className="space-y-1">
            <Label className="text-xs">Adjuntos</Label>
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                aria-label="Seleccionar archivos para adjuntar"
                onChange={(e) => {
                  if (e.target.files) {
                    setPendingFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
                    e.target.value = '';
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={() => fileInputRef.current?.click()}
              >
                <Paperclip className="mr-1.5 h-3.5 w-3.5" />
                Adjuntar archivos
              </Button>
              {pendingFiles.length > 0 && (
                <span className="text-xs text-muted-foreground">{pendingFiles.length} archivo(s)</span>
              )}
            </div>
            {pendingFiles.length > 0 && (
              <div className="space-y-1 mt-1">
                {pendingFiles.map((file, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs rounded border px-2 py-1">
                    <span className="flex-1 truncate">{file.name}</span>
                    <span className="text-muted-foreground shrink-0">
                      {file.size < 1024 * 1024
                        ? `${(file.size / 1024).toFixed(0)} KB`
                        : `${(file.size / (1024 * 1024)).toFixed(1)} MB`}
                    </span>
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => setPendingFiles((prev) => prev.filter((_, i) => i !== idx))}
                      aria-label={`Quitar archivo ${file.name}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter className="pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
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
  );
}
