'use client';

import React from 'react';
import { Check, X, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface AiSuggestionCardProps {
  title: string;
  description: string;
  type?: 'story' | 'risk' | 'description';
  onAccept: () => void;
  onReject: () => void;
  isLoading?: boolean;
}

export function AiSuggestionCard({
  title,
  description,
  type = 'story',
  onAccept,
  onReject,
  isLoading,
}: AiSuggestionCardProps) {
  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-primary/10 p-1.5">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-medium uppercase text-primary">
                Sugerencia IA
              </span>
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                {type}
              </span>
            </div>
            <h4 className="text-sm font-semibold">{title}</h4>
            <p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">
              {description}
            </p>
          </div>
        </div>

        <div className="mt-3 flex justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onReject}
            disabled={isLoading}
            className="h-8"
          >
            <X className="mr-1 h-3.5 w-3.5" />
            Descartar
          </Button>
          <Button
            size="sm"
            onClick={onAccept}
            disabled={isLoading}
            className="h-8"
          >
            <Check className="mr-1 h-3.5 w-3.5" />
            Aceptar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
