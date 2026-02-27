'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createRetroSchema, type CreateRetroInput } from '@arcadiux/shared/validators';
import { RetroTemplate } from '@arcadiux/shared/constants';
import { z } from 'zod';
import type { ApiResponse, RetroBoard, Sprint } from '@arcadiux/shared/types';
import { apiClient } from '@/lib/api-client';
import { formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
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
import { Plus, MessageSquare, Loader2, Calendar } from 'lucide-react';
import { toast } from 'sonner';

const templateLabels: Record<string, string> = {
  mad_sad_glad: 'Mad / Sad / Glad',
  start_stop_continue: 'Start / Stop / Continue',
  four_ls: 'Four Ls (Liked, Learned, Lacked, Longed For)',
  custom: 'Custom',
};

export default function RetroListPage() {
  const params = useParams<{ projectId: string }>();
  const projectId = params?.projectId ?? '';
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: retros, isLoading } = useQuery({
    queryKey: ['project', projectId, 'retros'],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<RetroBoard[]>>(
        `/api/projects/${projectId}/retros`,
      );
      return res.data;
    },
    enabled: !!projectId,
  });

  const { data: sprints } = useQuery({
    queryKey: ['project', projectId, 'sprints'],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<Sprint[]>>(
        `/api/projects/${projectId}/sprints`,
      );
      return res.data;
    },
    enabled: !!projectId,
  });

  const retroFormSchema = createRetroSchema.extend({
    sprintId: z.string().uuid(),
  });

  type RetroFormValues = z.infer<typeof retroFormSchema>;

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    reset,
  } = useForm<RetroFormValues>({
    resolver: zodResolver(retroFormSchema) as any,
    defaultValues: {
      name: '',
      template: RetroTemplate.MAD_SAD_GLAD,
      timerSeconds: 300,
      maxVotes: 3,
      isAnonymous: true,
      sprintId: '',
    },
  });

  const createRetroMutation = useMutation({
    mutationFn: async (data: RetroFormValues) => {
      return apiClient.post<ApiResponse<RetroBoard>>(
        `/api/projects/${projectId}/retros`,
        data,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['project', projectId, 'retros'],
      });
      toast.success('Retrospectiva creada');
      reset();
      setDialogOpen(false);
    },
    onError: () => {
      toast.error('Error al crear la retrospectiva');
    },
  });

  const onSubmit = (data: CreateRetroInput & { sprintId: string }) => {
    createRetroMutation.mutate(data);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Retrospectivas</h2>
          <p className="text-sm text-muted-foreground">
            Reflexiona sobre los sprints y mejora continuamente
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva Retro
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : retros && retros.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {retros.map((retro) => (
            <Link
              key={retro.id}
              href={`/projects/${projectId}/retro/${retro.id}`}
            >
              <Card className="transition-shadow hover:shadow-md cursor-pointer h-full">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-5 w-5 text-primary" />
                      <CardTitle className="text-base">
                        {retro.name}
                      </CardTitle>
                    </div>
                  </div>
                  <CardDescription>
                    {templateLabels[retro.template] ?? retro.template}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>{formatDate(retro.createdAt)}</span>
                  </div>
                  <div className="mt-2 flex gap-3 text-xs text-muted-foreground">
                    <span>
                      Temporizador: {Math.floor(retro.timerSeconds / 60)}m
                    </span>
                    <span>Votos máx: {retro.maxVotes}</span>
                    <span>{retro.isAnonymous ? 'Anónimo' : 'Con nombre'}</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-1">
              Aún no hay retrospectivas
            </h3>
            <p className="text-sm text-muted-foreground mb-6">
              Crea una retrospectiva después de completar un sprint.
            </p>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Crear Retrospectiva
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Create Retro Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Nueva Retrospectiva</DialogTitle>
            <DialogDescription>
              Crea un tablero de retro para la reflexión del equipo.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input
                placeholder="Retro Sprint 5"
                {...register('name')}
              />
              {errors.name && (
                <p className="text-xs text-destructive">
                  {errors.name.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Sprint</Label>
              <Select onValueChange={(v) => setValue('sprintId', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar sprint" />
                </SelectTrigger>
                <SelectContent>
                  {sprints?.map((sprint) => (
                    <SelectItem key={sprint.id} value={sprint.id}>
                      {sprint.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Plantilla</Label>
              <Select
                defaultValue={RetroTemplate.MAD_SAD_GLAD}
                onValueChange={(v) =>
                  setValue('template', v as CreateRetroInput['template'])
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(RetroTemplate).map((t) => (
                    <SelectItem key={t} value={t}>
                      {templateLabels[t] ?? t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Temporizador (segundos)</Label>
                <Input
                  type="number"
                  {...register('timerSeconds', { valueAsNumber: true })}
                />
              </div>
              <div className="space-y-2">
                <Label>Votos máximos</Label>
                <Input
                  type="number"
                  {...register('maxVotes', { valueAsNumber: true })}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={createRetroMutation.isPending}
              >
                {createRetroMutation.isPending && (
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
