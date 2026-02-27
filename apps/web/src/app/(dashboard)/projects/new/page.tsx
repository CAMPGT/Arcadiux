'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createProjectSchema, type CreateProjectInput } from '@arcadiux/shared/validators';
import { ProjectType } from '@arcadiux/shared/constants';
import type { ApiResponse, Project } from '@arcadiux/shared/types';
import { apiClient } from '@/lib/api-client';
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

export default function NewProjectPage() {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<CreateProjectInput>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: {
      name: '',
      key: '',
      description: '',
      projectType: ProjectType.SCRUM,
    },
  });

  const createProjectMutation = useMutation({
    mutationFn: async (data: CreateProjectInput) => {
      return apiClient.post<ApiResponse<Project>>('/api/projects', data);
    },
    onSuccess: (response) => {
      toast.success('¡Proyecto creado exitosamente!');
      router.push(`/projects/${response.data.id}/board`);
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : 'Error al crear el proyecto',
      );
    },
  });

  const onSubmit = (data: CreateProjectInput) => {
    createProjectMutation.mutate(data);
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    register('name').onChange(e);

    // Auto-generate key from name
    const key = name
      .replace(/[^a-zA-Z\s]/g, '')
      .split(/\s+/)
      .map((word) => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 5);

    if (key.length >= 2) {
      setValue('key', key);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/projects">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Crear Nuevo Proyecto
          </h1>
          <p className="text-muted-foreground">
            Configura un nuevo proyecto ágil para tu equipo
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Detalles del Proyecto</CardTitle>
          <CardDescription>
            Proporciona la información básica de tu proyecto.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre del Proyecto</Label>
              <Input
                id="name"
                placeholder="Mi Proyecto Increíble"
                {...register('name')}
                onChange={handleNameChange}
              />
              {errors.name && (
                <p className="text-xs text-destructive">
                  {errors.name.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="key">Clave del Proyecto</Label>
              <Input
                id="key"
                placeholder="MAP"
                className="uppercase"
                maxLength={5}
                {...register('key')}
              />
              <p className="text-xs text-muted-foreground">
                2-5 letras mayúsculas. Se usa como prefijo para las claves de issues (ej.,
                MAP-42).
              </p>
              {errors.key && (
                <p className="text-xs text-destructive">
                  {errors.key.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descripción (opcional)</Label>
              <Textarea
                id="description"
                placeholder="¿De qué trata este proyecto?"
                rows={4}
                {...register('description')}
              />
              {errors.description && (
                <p className="text-xs text-destructive">
                  {errors.description.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Tipo de Proyecto</Label>
              <Select
                defaultValue={ProjectType.SCRUM}
                onValueChange={(v) =>
                  setValue('projectType', v as CreateProjectInput['projectType'])
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ProjectType.SCRUM}>
                    <div>
                      <p className="font-medium">Scrum</p>
                      <p className="text-xs text-muted-foreground">
                        Sprints, backlog, seguimiento de velocidad
                      </p>
                    </div>
                  </SelectItem>
                  <SelectItem value={ProjectType.KANBAN}>
                    <div>
                      <p className="font-medium">Kanban</p>
                      <p className="text-xs text-muted-foreground">
                        Flujo continuo con límites WIP
                      </p>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" asChild>
                <Link href="/projects">Cancelar</Link>
              </Button>
              <Button
                type="submit"
                disabled={createProjectMutation.isPending}
              >
                {createProjectMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Crear Proyecto
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
