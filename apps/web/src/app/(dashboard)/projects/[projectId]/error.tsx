'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

export default function ProjectError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <AlertTriangle className="h-12 w-12 text-destructive" />
      <h2 className="text-xl font-semibold">Error en el proyecto</h2>
      <p className="max-w-md text-sm text-muted-foreground">
        {error.message || 'No se pudo cargar la información del proyecto.'}
      </p>
      <div className="flex gap-2">
        <Button onClick={reset} variant="outline">
          Reintentar
        </Button>
        <Button onClick={() => router.push('/projects')} variant="secondary">
          Volver a Proyectos
        </Button>
      </div>
    </div>
  );
}
