'use client';

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface VelocityDataPoint {
  sprint: string;
  committed: number;
  completed: number;
}

interface VelocityChartProps {
  data: VelocityDataPoint[];
}

export function VelocityChart({ data }: VelocityChartProps) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Gráfico de Velocidad</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
            No hay datos de sprints disponibles aún.
          </div>
        </CardContent>
      </Card>
    );
  }

  const averageVelocity =
    data.length > 0
      ? Math.round(
          data.reduce((sum, d) => sum + d.completed, 0) / data.length,
        )
      : 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Gráfico de Velocidad</CardTitle>
          <div className="text-sm text-muted-foreground">
            Velocidad promedio:{' '}
            <span className="font-semibold text-foreground">
              {averageVelocity} pts
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="sprint"
              tick={{ fontSize: 12 }}
              className="text-muted-foreground"
            />
            <YAxis
              tick={{ fontSize: 12 }}
              className="text-muted-foreground"
              label={{
                value: 'Puntos de Historia',
                angle: -90,
                position: 'insideLeft',
                style: { fontSize: 12 },
              }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: 'var(--radius)',
                fontSize: 12,
              }}
            />
            <Legend />
            <Bar
              dataKey="committed"
              fill="#94A3B8"
              name="Comprometidos"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="completed"
              fill="hsl(221.2, 83.2%, 53.3%)"
              name="Completados"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
