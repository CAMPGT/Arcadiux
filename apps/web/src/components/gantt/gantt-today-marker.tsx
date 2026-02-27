'use client';

import React from 'react';

interface GanttTodayMarkerProps {
  x: number;
  height: number;
}

export function GanttTodayMarker({ x, height }: GanttTodayMarkerProps) {
  return (
    <div
      className="pointer-events-none absolute top-0 z-10"
      style={{ left: x, height }}
    >
      <div className="h-full w-0.5 bg-primary" />
      <div className="absolute -left-1.5 -top-1 h-3 w-3 rounded-full bg-primary" />
    </div>
  );
}
