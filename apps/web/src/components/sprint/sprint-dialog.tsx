'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createSprintSchema, type CreateSprintInput } from '@arcadiux/shared/validators';
import type { Sprint } from '@arcadiux/shared/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface SprintDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateSprintInput) => void;
  sprint?: Sprint | null;
  isLoading?: boolean;
}

export function SprintDialog({
  open,
  onOpenChange,
  onSubmit,
  sprint,
  isLoading,
}: SprintDialogProps) {
  const isEditing = !!sprint;

  const toDateString = (d: Date | string) => {
    const s = typeof d === 'string' ? d : d.toISOString();
    return s.slice(0, 10);
  };

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<CreateSprintInput>({
    resolver: zodResolver(createSprintSchema),
    defaultValues: sprint
      ? {
          name: sprint.name,
          goal: sprint.goal ?? undefined,
          startDate: toDateString(sprint.startDate),
          endDate: toDateString(sprint.endDate),
        }
      : {
          name: '',
          goal: '',
          startDate: toDateString(new Date()),
          endDate: toDateString(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)),
        },
  });

  const handleFormSubmit = (data: CreateSprintInput) => {
    onSubmit(data);
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Sprint' : 'Crear Sprint'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Actualiza los detalles del sprint a continuación.'
              : 'Define un nuevo sprint para tu proyecto.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre del Sprint</Label>
            <Input
              id="name"
              placeholder="Sprint 1"
              {...register('name')}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="goal">Objetivo (opcional)</Label>
            <Textarea
              id="goal"
              placeholder="¿Qué debe lograr este sprint?"
              {...register('goal')}
            />
            {errors.goal && (
              <p className="text-xs text-destructive">{errors.goal.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Fecha de Inicio</Label>
              <Input
                id="startDate"
                type="date"
                {...register('startDate')}
              />
              {errors.startDate && (
                <p className="text-xs text-destructive">
                  {errors.startDate.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">Fecha de Fin</Label>
              <Input
                id="endDate"
                type="date"
                {...register('endDate')}
              />
              {errors.endDate && (
                <p className="text-xs text-destructive">
                  {errors.endDate.message}
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading
                ? 'Guardando...'
                : isEditing
                  ? 'Actualizar Sprint'
                  : 'Crear Sprint'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
