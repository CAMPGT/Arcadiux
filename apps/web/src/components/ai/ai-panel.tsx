'use client';

import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  Sparkles,
  X,
  FileText,
  Layers,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import type { ApiResponse } from '@arcadiux/shared/types';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AiSuggestionCard } from './ai-suggestion-card';
import { IssueType } from '@arcadiux/shared/constants';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface AiPanelProps {
  projectId: string;
  open: boolean;
  onClose: () => void;
}

type AiFeature = 'description' | 'breakdown' | 'risks';

interface AiSuggestion {
  title: string;
  description: string;
  type: string;
}

export function AiPanel({ projectId, open, onClose }: AiPanelProps) {
  const [activeFeature, setActiveFeature] = useState<AiFeature>('description');
  const [suggestions, setSuggestions] = useState<AiSuggestion[]>([]);

  // Description generation state
  const [descTitle, setDescTitle] = useState('');
  const [descType, setDescType] = useState<string>(IssueType.STORY);
  const [descContext, setDescContext] = useState('');

  // Epic breakdown state
  const [epicTitle, setEpicTitle] = useState('');
  const [epicDescription, setEpicDescription] = useState('');

  // Risk detection state
  const [sprintGoal, setSprintGoal] = useState('');

  const generateDescriptionMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post<ApiResponse<{ description: string }>>(
        `/api/projects/${projectId}/ai/description`,
        {
          title: descTitle,
          issueType: descType,
          context: descContext || undefined,
        },
      );
      return res.data;
    },
    onSuccess: (data) => {
      setSuggestions([
        {
          title: descTitle,
          description: data.description,
          type: 'description',
        },
      ]);
    },
    onError: () => {
      toast.error('Error al generar la descripción');
    },
  });

  const breakdownEpicMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post<
        ApiResponse<{ stories: { title: string; description: string }[] }>
      >(`/api/projects/${projectId}/ai/breakdown`, {
        epicTitle,
        epicDescription,
      });
      return res.data;
    },
    onSuccess: (data) => {
      setSuggestions(
        data.stories.map((s) => ({
          title: s.title,
          description: s.description,
          type: 'story',
        })),
      );
    },
    onError: () => {
      toast.error('Error al desglosar la épica');
    },
  });

  const detectRisksMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post<
        ApiResponse<{ risks: { title: string; description: string }[] }>
      >(`/api/projects/${projectId}/ai/risks`, {
        sprintGoal,
        issues: [],
      });
      return res.data;
    },
    onSuccess: (data) => {
      setSuggestions(
        data.risks.map((r) => ({
          title: r.title,
          description: r.description,
          type: 'risk',
        })),
      );
    },
    onError: () => {
      toast.error('Error al detectar riesgos');
    },
  });

  const isLoading =
    generateDescriptionMutation.isPending ||
    breakdownEpicMutation.isPending ||
    detectRisksMutation.isPending;

  const handleAcceptSuggestion = (index: number) => {
    const suggestion = suggestions[index];
    navigator.clipboard.writeText(suggestion.description);
    toast.success('Copiado al portapapeles');
    setSuggestions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRejectSuggestion = (index: number) => {
    setSuggestions((prev) => prev.filter((_, i) => i !== index));
  };

  const features: { id: AiFeature; label: string; icon: React.ElementType }[] = [
    { id: 'description', label: 'Generar Descripción', icon: FileText },
    { id: 'breakdown', label: 'Desglosar Épica', icon: Layers },
    { id: 'risks', label: 'Detectar Riesgos', icon: AlertTriangle },
  ];

  return (
    <div
      className={cn(
        'fixed right-0 top-0 z-40 flex h-screen w-96 flex-col border-l bg-background shadow-lg transition-transform duration-300',
        open ? 'translate-x-0' : 'translate-x-full',
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">Asistente IA</h2>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Feature Tabs */}
      <div className="flex border-b">
        {features.map((feature) => (
          <button
            key={feature.id}
            onClick={() => {
              setActiveFeature(feature.id);
              setSuggestions([]);
            }}
            className={cn(
              'flex flex-1 items-center justify-center gap-1.5 px-2 py-2.5 text-xs font-medium transition-colors',
              activeFeature === feature.id
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <feature.icon className="h-3.5 w-3.5" />
            {feature.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Generate Description */}
        {activeFeature === 'description' && (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Título del Issue</Label>
              <Input
                value={descTitle}
                onChange={(e) => setDescTitle(e.target.value)}
                placeholder="Ingresa el título del issue"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Tipo de Issue</Label>
              <Select value={descType} onValueChange={setDescType}>
                <SelectTrigger>
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
            <div className="space-y-1.5">
              <Label className="text-xs">Contexto (opcional)</Label>
              <Textarea
                value={descContext}
                onChange={(e) => setDescContext(e.target.value)}
                placeholder="Contexto adicional sobre el issue..."
                rows={3}
              />
            </div>
            <Button
              className="w-full"
              onClick={() => generateDescriptionMutation.mutate()}
              disabled={!descTitle.trim() || isLoading}
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" />
              )}
              Generar Descripción
            </Button>
          </div>
        )}

        {/* Break Down Epic */}
        {activeFeature === 'breakdown' && (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Título de la Épica</Label>
              <Input
                value={epicTitle}
                onChange={(e) => setEpicTitle(e.target.value)}
                placeholder="Ingresa el título de la épica"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Descripción de la Épica</Label>
              <Textarea
                value={epicDescription}
                onChange={(e) => setEpicDescription(e.target.value)}
                placeholder="Describe lo que esta épica debe lograr..."
                rows={6}
              />
            </div>
            <Button
              className="w-full"
              onClick={() => breakdownEpicMutation.mutate()}
              disabled={!epicTitle.trim() || !epicDescription.trim() || isLoading}
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Layers className="mr-2 h-4 w-4" />
              )}
              Desglosar en Historias
            </Button>
          </div>
        )}

        {/* Detect Risks */}
        {activeFeature === 'risks' && (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Objetivo del Sprint</Label>
              <Textarea
                value={sprintGoal}
                onChange={(e) => setSprintGoal(e.target.value)}
                placeholder="¿Qué intenta lograr el sprint?"
                rows={4}
              />
            </div>
            <Button
              className="w-full"
              onClick={() => detectRisksMutation.mutate()}
              disabled={!sprintGoal.trim() || isLoading}
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <AlertTriangle className="mr-2 h-4 w-4" />
              )}
              Analizar Riesgos
            </Button>
          </div>
        )}

        {/* Suggestions */}
        {suggestions.length > 0 && (
          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Sugerencias ({suggestions.length})
            </h3>
            {suggestions.map((suggestion, index) => (
              <AiSuggestionCard
                key={index}
                title={suggestion.title}
                description={suggestion.description}
                type={suggestion.type as 'story' | 'risk' | 'description'}
                onAccept={() => handleAcceptSuggestion(index)}
                onReject={() => handleRejectSuggestion(index)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
