'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <AlertTriangle className="h-12 w-12 text-destructive" />
      <h2 className="text-xl font-semibold">Algo salió mal</h2>
      <p className="max-w-md text-sm text-muted-foreground">
        {error.message || 'Ocurrió un error inesperado. Intenta de nuevo.'}
      </p>
      <Button onClick={reset} variant="outline">
        Reintentar
      </Button>
    </div>
  );
}
