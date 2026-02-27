'use client';

import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface AvatarDisplayProps {
  fullName?: string | null;
  avatarUrl?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

const sizeClasses = {
  sm: 'h-6 w-6 text-[10px]',
  md: 'h-8 w-8 text-xs',
  lg: 'h-10 w-10 text-sm',
};

export function AvatarDisplay({
  fullName,
  avatarUrl,
  size = 'md',
  className,
}: AvatarDisplayProps) {
  const initials = fullName ? getInitials(fullName) : '?';

  return (
    <Avatar className={cn(sizeClasses[size], className)}>
      {avatarUrl && <AvatarImage src={avatarUrl} alt={fullName ?? 'Usuario'} />}
      <AvatarFallback className={cn(sizeClasses[size], 'bg-primary/10 text-primary font-medium')}>
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}
