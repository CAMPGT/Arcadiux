'use client';

import React from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-center px-4">
      <h2 className="text-xl font-semibold">Algo salió mal</h2>
      <p className="max-w-md text-sm text-muted-foreground">
        {error.message || 'Ocurrió un error inesperado.'}
      </p>
      <button
        onClick={reset}
        className="rounded-md border px-4 py-2 text-sm hover:bg-gray-100"
      >
        Reintentar
      </button>
    </div>
  );
}
