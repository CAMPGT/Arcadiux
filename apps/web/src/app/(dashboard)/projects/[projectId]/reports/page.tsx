'use client';

import React, { useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import type { ApiResponse, Sprint, Issue, WorkflowStatus } from '@arcadiux/shared/types';
import { IssueCategory, IssueCategoryLabels } from '@arcadiux/shared/constants';
import { apiClient } from '@/lib/api-client';
import { BurndownChart } from '@/components/reports/burndown-chart';
import { VelocityChart } from '@/components/reports/velocity-chart';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatDate } from '@/lib/utils';
import { TrendingUp, Target, Clock, Users } from 'lucide-react';
import { useState } from 'react';

export default function ReportsPage() {
  const params = useParams<{ projectId: string }>();
  const projectId = params?.projectId ?? '';
  const [selectedSprintId, setSelectedSprintId] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

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

  const { data: issues } = useQuery({
    queryKey: ['project', projectId, 'issues'],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<Issue[]>>(
        `/api/projects/${projectId}/issues`,
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

  const doneStatusIds = useMemo(
    () =>
      new Set(
        statuses?.filter((s) => s.category === 'done').map((s) => s.id) ?? [],
      ),
    [statuses],
  );

  const activeSprint = useMemo(
    () => sprints?.find((s) => s.status === 'active'),
    [sprints],
  );

  const currentSprintId = selectedSprintId || activeSprint?.id || '';
  const currentSprint = sprints?.find((s) => s.id === currentSprintId);

  // Build burndown data
  const burndownData = useMemo(() => {
    if (!currentSprint || !issues) return [];

    const sprintIssues = issues.filter((i) =>
      i.sprintId === currentSprint.id &&
      (selectedCategory === 'all' || i.category === selectedCategory)
    );
    const totalPoints = sprintIssues.reduce(
      (sum, i) => sum + (i.storyPoints ?? 0),
      0,
    );

    const startDate = new Date(currentSprint.startDate);
    const endDate = new Date(currentSprint.endDate);
    const days = Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
    );

    const data = [];
    for (let i = 0; i <= days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const ideal = totalPoints - (totalPoints / days) * i;

      // For actual, simulate based on completed issues up to this date
      const completedPoints = sprintIssues
        .filter((issue) => {
          if (!doneStatusIds.has(issue.statusId)) return false;
          return new Date(issue.updatedAt) <= date;
        })
        .reduce((sum, i) => sum + (i.storyPoints ?? 0), 0);

      data.push({
        date: formatDate(date, 'MMM d'),
        ideal: Math.round(ideal * 10) / 10,
        actual: totalPoints - completedPoints,
      });
    }
    return data;
  }, [currentSprint, issues, doneStatusIds, selectedCategory]);

  // Build velocity data
  const velocityData = useMemo(() => {
    if (!sprints || !issues) return [];

    const completedSprints = sprints
      .filter((s) => s.status === 'completed' || s.status === 'active')
      .sort(
        (a, b) =>
          new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
      )
      .slice(-8);

    return completedSprints.map((sprint) => {
      const sprintIssues = issues.filter((i) =>
        i.sprintId === sprint.id &&
        (selectedCategory === 'all' || i.category === selectedCategory)
      );
      const committed = sprintIssues.reduce(
        (sum, i) => sum + (i.storyPoints ?? 0),
        0,
      );
      const completed = sprintIssues
        .filter((i) => doneStatusIds.has(i.statusId))
        .reduce((sum, i) => sum + (i.storyPoints ?? 0), 0);

      return {
        sprint: sprint.name,
        committed,
        completed,
      };
    });
  }, [sprints, issues, doneStatusIds, selectedCategory]);

  // Summary stats
  const summaryStats = useMemo(() => {
    if (!currentSprint || !issues) {
      return {
        totalIssues: 0,
        completedIssues: 0,
        totalPoints: 0,
        completedPoints: 0,
      };
    }

    const sprintIssues = issues.filter((i) =>
      i.sprintId === currentSprint.id &&
      (selectedCategory === 'all' || i.category === selectedCategory)
    );
    const completed = sprintIssues.filter((i) => doneStatusIds.has(i.statusId));

    return {
      totalIssues: sprintIssues.length,
      completedIssues: completed.length,
      totalPoints: sprintIssues.reduce(
        (sum, i) => sum + (i.storyPoints ?? 0),
        0,
      ),
      completedPoints: completed.reduce(
        (sum, i) => sum + (i.storyPoints ?? 0),
        0,
      ),
    };
  }, [currentSprint, issues, doneStatusIds, selectedCategory]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Reportes</h2>
        <div className="flex items-center gap-3">
          <Select
            value={selectedCategory}
            onValueChange={setSelectedCategory}
          >
            <SelectTrigger className="w-52">
              <SelectValue placeholder="Todas las categorías" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las categorías</SelectItem>
              {Object.values(IssueCategory).map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {IssueCategoryLabels[cat]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {sprints && sprints.length > 0 && (
            <Select
              value={currentSprintId}
              onValueChange={setSelectedSprintId}
            >
              <SelectTrigger className="w-56">
                <SelectValue placeholder="Seleccionar sprint" />
              </SelectTrigger>
              <SelectContent>
                {sprints.map((sprint) => (
                  <SelectItem key={sprint.id} value={sprint.id}>
                    {sprint.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      {currentSprint && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total de Issues
              </CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {summaryStats.totalIssues}
              </div>
              <p className="text-xs text-muted-foreground">
                {summaryStats.completedIssues} completados
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Puntos de Historia
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {summaryStats.completedPoints}/{summaryStats.totalPoints}
              </div>
              <p className="text-xs text-muted-foreground">
                {summaryStats.totalPoints > 0
                  ? Math.round(
                      (summaryStats.completedPoints /
                        summaryStats.totalPoints) *
                        100,
                    )
                  : 0}
                % completados
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Duración</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Math.ceil(
                  (new Date(currentSprint.endDate).getTime() -
                    new Date(currentSprint.startDate).getTime()) /
                    (1000 * 60 * 60 * 24),
                )}{' '}
                días
              </div>
              <p className="text-xs text-muted-foreground">
                {formatDate(currentSprint.startDate, 'MMM d')} -{' '}
                {formatDate(currentSprint.endDate, 'MMM d')}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Tasa de Completado
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {summaryStats.totalIssues > 0
                  ? Math.round(
                      (summaryStats.completedIssues /
                        summaryStats.totalIssues) *
                        100,
                    )
                  : 0}
                %
              </div>
              <p className="text-xs text-muted-foreground">
                Issues completados vs total
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="burndown">
        <TabsList>
          <TabsTrigger value="burndown">Burndown</TabsTrigger>
          <TabsTrigger value="velocity">Velocidad</TabsTrigger>
        </TabsList>

        <TabsContent value="burndown">
          <BurndownChart
            data={burndownData}
            sprintName={currentSprint?.name ?? 'Ningún Sprint seleccionado'}
          />
        </TabsContent>

        <TabsContent value="velocity">
          <VelocityChart data={velocityData} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
