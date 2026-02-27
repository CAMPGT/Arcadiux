'use client';

import React, { useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { updateProjectSchema, type UpdateProjectInput } from '@arcadiux/shared/validators';
import type {
  ApiResponse,
  Project,
  WorkflowStatus,
  User,
  ProjectMember,
  Responsible,
} from '@arcadiux/shared/types';
import { ProjectRole, StatusCategory } from '@arcadiux/shared/constants';
import { apiClient } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { AvatarDisplay } from '@/components/shared/avatar-display';
import { StatusBadge } from '@/components/shared/status-badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Loader2, Plus, Trash2, UserPlus, GripVertical, Pencil } from 'lucide-react';
import { toast } from 'sonner';

interface MemberWithUser extends ProjectMember {
  user: User;
}

function SortableStatusRow({
  status,
  onToggle,
  onDelete,
  isDeleting,
}: {
  status: WorkflowStatus;
  onToggle: (statusId: string, isActive: boolean) => void;
  onDelete: (statusId: string) => void;
  isDeleting: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: status.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center justify-between rounded-lg border p-3 transition-opacity bg-background',
        !status.isActive && 'opacity-50',
        isDragging && 'opacity-50 shadow-lg ring-2 ring-primary z-50',
      )}
    >
      <div className="flex items-center gap-3">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground touch-none"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <Switch
          checked={status.isActive}
          onCheckedChange={(checked) => onToggle(status.id, checked)}
        />
        <div
          className={cn(
            'h-3 w-3 rounded-full',
            status.category === 'todo' && 'bg-gray-400',
            status.category === 'in_progress' && 'bg-blue-500',
            status.category === 'done' && 'bg-green-500',
          )}
        />
        <span className="text-sm font-medium">{status.name}</span>
        <StatusBadge
          name={status.category}
          category={status.category}
        />
      </div>
      <div className="flex items-center gap-3">
        {status.wipLimit !== null && (
          <Badge variant="outline" className="text-xs">
            WIP: {status.wipLimit}
          </Badge>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-destructive"
          onClick={() => onDelete(status.id)}
          disabled={isDeleting}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export default function ProjectSettingsPage() {
  const params = useParams<{ projectId: string }>();
  const projectId = params?.projectId ?? '';
  const queryClient = useQueryClient();
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [addStatusOpen, setAddStatusOpen] = useState(false);
  const [newStatusName, setNewStatusName] = useState('');
  const [newStatusCategory, setNewStatusCategory] = useState<string>('in_progress');
  const [newStatusWipLimit, setNewStatusWipLimit] = useState('');
  const [addResponsibleOpen, setAddResponsibleOpen] = useState(false);
  const [editingResponsible, setEditingResponsible] = useState<Responsible | null>(null);
  const [respFullName, setRespFullName] = useState('');
  const [respEmail, setRespEmail] = useState('');
  const [respJobTitle, setRespJobTitle] = useState('');

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

  const { data: members } = useQuery({
    queryKey: ['project', projectId, 'members-full'],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<MemberWithUser[]>>(
        `/api/projects/${projectId}/members`,
      );
      return res.data;
    },
    enabled: !!projectId,
  });

  const { data: responsiblesList } = useQuery({
    queryKey: ['project', projectId, 'responsibles'],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<Responsible[]>>(
        `/api/projects/${projectId}/responsibles`,
      );
      return res.data;
    },
    enabled: !!projectId,
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UpdateProjectInput>({
    resolver: zodResolver(updateProjectSchema),
    values: project
      ? {
          name: project.name,
          key: project.key,
          description: project.description ?? undefined,
        }
      : undefined,
  });

  const updateProjectMutation = useMutation({
    mutationFn: async (data: UpdateProjectInput) => {
      return apiClient.patch<ApiResponse<Project>>(
        `/api/projects/${projectId}`,
        data,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['project', projectId],
      });
      toast.success('Proyecto actualizado');
    },
    onError: () => {
      toast.error('Error al actualizar el proyecto');
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ statusId, isActive }: { statusId: string; isActive: boolean }) => {
      return apiClient.patch<ApiResponse<WorkflowStatus>>(
        `/api/projects/${projectId}/statuses/${statusId}`,
        { isActive },
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['project', projectId, 'statuses'],
      });
    },
    onError: () => {
      toast.error('Error al cambiar estado');
    },
  });

  const createStatusMutation = useMutation({
    mutationFn: async (data: { name: string; category: string; wipLimit?: number | null }) => {
      return apiClient.post<ApiResponse<WorkflowStatus>>(
        `/api/projects/${projectId}/statuses`,
        data,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['project', projectId, 'statuses'],
      });
      toast.success('Estado creado');
      setAddStatusOpen(false);
      setNewStatusName('');
      setNewStatusCategory('in_progress');
      setNewStatusWipLimit('');
    },
    onError: () => {
      toast.error('Error al crear estado');
    },
  });

  const deleteStatusMutation = useMutation({
    mutationFn: async (statusId: string) => {
      return apiClient.delete(
        `/api/projects/${projectId}/statuses/${statusId}`,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['project', projectId, 'statuses'],
      });
      toast.success('Estado eliminado');
    },
    onError: () => {
      toast.error('No se puede eliminar un estado que tiene issues asignados');
    },
  });

  const addMemberMutation = useMutation({
    mutationFn: async (data: { email: string; role: string }) => {
      return apiClient.post<ApiResponse<ProjectMember>>(
        `/api/projects/${projectId}/members`,
        data,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['project', projectId, 'members-full'],
      });
      toast.success('Miembro agregado');
      setAddMemberOpen(false);
      setInviteEmail('');
    },
    onError: () => {
      toast.error('Error al agregar miembro');
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: async (userId: string) => {
      return apiClient.delete(
        `/api/projects/${projectId}/members/${userId}`,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['project', projectId, 'members-full'],
      });
      toast.success('Miembro eliminado');
    },
    onError: () => {
      toast.error('Error al eliminar miembro');
    },
  });

  const createResponsibleMutation = useMutation({
    mutationFn: async (data: { fullName: string; email?: string; jobTitle?: string }) => {
      return apiClient.post<ApiResponse<Responsible>>(
        `/api/projects/${projectId}/responsibles`,
        data,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['project', projectId, 'responsibles'],
      });
      toast.success('Responsable creado');
      setAddResponsibleOpen(false);
      setRespFullName('');
      setRespEmail('');
      setRespJobTitle('');
    },
    onError: () => {
      toast.error('Error al crear responsable');
    },
  });

  const updateResponsibleMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { fullName?: string; email?: string; jobTitle?: string } }) => {
      return apiClient.patch<ApiResponse<Responsible>>(
        `/api/projects/${projectId}/responsibles/${id}`,
        data,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['project', projectId, 'responsibles'],
      });
      toast.success('Responsable actualizado');
      setEditingResponsible(null);
      setRespFullName('');
      setRespEmail('');
      setRespJobTitle('');
    },
    onError: () => {
      toast.error('Error al actualizar responsable');
    },
  });

  const deleteResponsibleMutation = useMutation({
    mutationFn: async (responsibleId: string) => {
      return apiClient.delete(
        `/api/projects/${projectId}/responsibles/${responsibleId}`,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['project', projectId, 'responsibles'],
      });
      toast.success('Responsable eliminado');
    },
    onError: () => {
      toast.error('Error al eliminar responsable');
    },
  });

  const reorderStatusMutation = useMutation({
    mutationFn: async ({ statusId, position }: { statusId: string; position: number }) => {
      return apiClient.patch<ApiResponse<WorkflowStatus>>(
        `/api/projects/${projectId}/statuses/${statusId}`,
        { position },
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['project', projectId, 'statuses'],
      });
    },
    onError: () => {
      queryClient.invalidateQueries({
        queryKey: ['project', projectId, 'statuses'],
      });
      toast.error('Error al reordenar estados');
    },
  });

  const dndSensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
  );

  const onSubmit = (data: UpdateProjectInput) => {
    updateProjectMutation.mutate(data);
  };

  const sortedStatuses = statuses
    ? [...statuses].sort((a, b) => a.position - b.position)
    : [];

  const handleStatusDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = sortedStatuses.findIndex((s) => s.id === active.id);
      const newIndex = sortedStatuses.findIndex((s) => s.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;

      const reordered = arrayMove(sortedStatuses, oldIndex, newIndex);

      // Optimistic update
      queryClient.setQueryData(
        ['project', projectId, 'statuses'],
        reordered.map((s, i) => ({ ...s, position: i })),
      );

      // Send the new position of the moved item
      reorderStatusMutation.mutate({
        statusId: active.id as string,
        position: newIndex,
      });
    },
    [sortedStatuses, queryClient, projectId, reorderStatusMutation],
  );

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      {/* Project Info */}
      <Card>
        <CardHeader>
          <CardTitle>General</CardTitle>
          <CardDescription>
            Actualiza el nombre, clave y descripción de tu proyecto.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre del Proyecto</Label>
              <Input {...register('name')} />
              {errors.name && (
                <p className="text-xs text-destructive">
                  {errors.name.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Clave del Proyecto</Label>
              <Input {...register('key')} className="uppercase" />
              {errors.key && (
                <p className="text-xs text-destructive">
                  {errors.key.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Descripción</Label>
              <Textarea rows={3} {...register('description')} />
            </div>
            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={updateProjectMutation.isPending}
              >
                {updateProjectMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Guardar Cambios
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Workflow Statuses */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Estados del Flujo</CardTitle>
              <CardDescription>
                Configura las columnas del flujo de trabajo para tu tablero.
                Activa o desactiva estados para controlar qué columnas aparecen.
              </CardDescription>
            </div>
            <Button size="sm" onClick={() => setAddStatusOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Agregar Estado
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <DndContext
            sensors={dndSensors}
            collisionDetection={closestCenter}
            onDragEnd={handleStatusDragEnd}
          >
            <SortableContext
              items={sortedStatuses.map((s) => s.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-3">
                {sortedStatuses.map((status) => (
                  <SortableStatusRow
                    key={status.id}
                    status={status}
                    onToggle={(id, isActive) =>
                      toggleStatusMutation.mutate({ statusId: id, isActive })
                    }
                    onDelete={(id) => deleteStatusMutation.mutate(id)}
                    isDeleting={deleteStatusMutation.isPending}
                  />
                ))}

                {sortedStatuses.length === 0 && (
                  <p className="py-4 text-center text-sm text-muted-foreground">
                    No hay estados de flujo configurados.
                  </p>
                )}
              </div>
            </SortableContext>
          </DndContext>
        </CardContent>
      </Card>

      {/* Members */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Miembros</CardTitle>
              <CardDescription>
                Gestiona quién tiene acceso a este proyecto.
              </CardDescription>
            </div>
            <Button size="sm" onClick={() => setAddMemberOpen(true)}>
              <UserPlus className="mr-2 h-4 w-4" />
              Agregar Miembro
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {members?.map((member) => (
              <div
                key={member.userId}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div className="flex items-center gap-3">
                  <AvatarDisplay
                    fullName={member.user.fullName}
                    avatarUrl={member.user.avatarUrl}
                    size="md"
                  />
                  <div>
                    <p className="text-sm font-medium">
                      {member.user.fullName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {member.user.email}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge
                    variant="outline"
                    className={cn(
                      'capitalize',
                      member.role === 'admin' && 'border-primary text-primary',
                    )}
                  >
                    {member.role}
                  </Badge>
                  {member.role !== 'admin' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() =>
                        removeMemberMutation.mutate(member.userId)
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Responsables */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Responsables</CardTitle>
              <CardDescription>
                Gestiona los responsables disponibles para asignar a issues y épicas.
              </CardDescription>
            </div>
            <Button size="sm" onClick={() => {
              setRespFullName('');
              setRespEmail('');
              setRespJobTitle('');
              setEditingResponsible(null);
              setAddResponsibleOpen(true);
            }}>
              <Plus className="mr-2 h-4 w-4" />
              Agregar Responsable
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {responsiblesList?.map((resp) => (
              <div
                key={resp.id}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div>
                  <p className="text-sm font-medium">{resp.fullName}</p>
                  <div className="flex gap-3 text-xs text-muted-foreground">
                    {resp.email && <span>{resp.email}</span>}
                    {resp.jobTitle && <span>{resp.jobTitle}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      setEditingResponsible(resp);
                      setRespFullName(resp.fullName);
                      setRespEmail(resp.email ?? '');
                      setRespJobTitle(resp.jobTitle ?? '');
                      setAddResponsibleOpen(true);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => deleteResponsibleMutation.mutate(resp.id)}
                    disabled={deleteResponsibleMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}

            {(!responsiblesList || responsiblesList.length === 0) && (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No hay responsables configurados. Agrega uno para poder asignarlo a issues.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Responsible Dialog */}
      <Dialog open={addResponsibleOpen} onOpenChange={setAddResponsibleOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>
              {editingResponsible ? 'Editar Responsable' : 'Agregar Responsable'}
            </DialogTitle>
            <DialogDescription>
              {editingResponsible
                ? 'Actualiza los datos del responsable.'
                : 'Crea un nuevo responsable para poder asignarlo a issues.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre completo</Label>
              <Input
                placeholder="Ej: Juan Pérez"
                value={respFullName}
                onChange={(e) => setRespFullName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Correo electrónico (opcional)</Label>
              <Input
                type="email"
                placeholder="Ej: juan@empresa.com"
                value={respEmail}
                onChange={(e) => setRespEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Cargo (opcional)</Label>
              <Input
                placeholder="Ej: Product Owner, Tech Lead..."
                value={respJobTitle}
                onChange={(e) => setRespJobTitle(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setAddResponsibleOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                onClick={() => {
                  const data: { fullName: string; email?: string; jobTitle?: string } = {
                    fullName: respFullName,
                  };
                  if (respEmail.trim()) data.email = respEmail.trim();
                  if (respJobTitle.trim()) data.jobTitle = respJobTitle.trim();

                  if (editingResponsible) {
                    updateResponsibleMutation.mutate({ id: editingResponsible.id, data });
                  } else {
                    createResponsibleMutation.mutate(data);
                  }
                }}
                disabled={
                  !respFullName.trim() ||
                  createResponsibleMutation.isPending ||
                  updateResponsibleMutation.isPending
                }
              >
                {(createResponsibleMutation.isPending || updateResponsibleMutation.isPending) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {editingResponsible ? 'Guardar' : 'Crear'}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Status Dialog */}
      <Dialog open={addStatusOpen} onOpenChange={setAddStatusOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Agregar Estado</DialogTitle>
            <DialogDescription>
              Crea un nuevo estado para el flujo de trabajo de tu tablero.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input
                placeholder="Ej: Diseño, QA, Deploy..."
                value={newStatusName}
                onChange={(e) => setNewStatusName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Categoría</Label>
              <Select
                value={newStatusCategory}
                onValueChange={setNewStatusCategory}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todo">Por hacer</SelectItem>
                  <SelectItem value="in_progress">En progreso</SelectItem>
                  <SelectItem value="done">Completado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Límite WIP (opcional)</Label>
              <Input
                type="number"
                min={1}
                placeholder="Sin límite"
                value={newStatusWipLimit}
                onChange={(e) => setNewStatusWipLimit(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setAddStatusOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                onClick={() =>
                  createStatusMutation.mutate({
                    name: newStatusName,
                    category: newStatusCategory,
                    wipLimit: newStatusWipLimit
                      ? parseInt(newStatusWipLimit, 10)
                      : null,
                  })
                }
                disabled={
                  !newStatusName.trim() || createStatusMutation.isPending
                }
              >
                {createStatusMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Crear
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Member Dialog */}
      <Dialog open={addMemberOpen} onOpenChange={setAddMemberOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Agregar Miembro</DialogTitle>
            <DialogDescription>
              Invita a un miembro del equipo por su correo electrónico.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Correo electrónico</Label>
              <Input
                type="email"
                placeholder="equipo@ejemplo.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setAddMemberOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                onClick={() =>
                  addMemberMutation.mutate({
                    email: inviteEmail,
                    role: ProjectRole.MEMBER,
                  })
                }
                disabled={
                  !inviteEmail.trim() || addMemberMutation.isPending
                }
              >
                {addMemberMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Agregar
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
