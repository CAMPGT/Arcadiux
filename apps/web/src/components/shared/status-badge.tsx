'use client';

import React from 'react';
import type { StatusCategory } from '@arcadiux/shared/constants';
import { Badge } from '@/components/ui/badge';
import { cn, getStatusCategoryColor } from '@/lib/utils';

interface StatusBadgeProps {
  name: string;
  category: StatusCategory;
  className?: string;
}

export function StatusBadge({ name, category, className }: StatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(getStatusCategoryColor(category), 'border', className)}
    >
      {name}
    </Badge>
  );
}
