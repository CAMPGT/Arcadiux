'use client';

import React from 'react';
import type { RetroNote } from '@arcadiux/shared/types';
import { ThumbsUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface StickyNoteProps {
  note: RetroNote;
  voteCount: number;
  hasVoted: boolean;
  authorName?: string;
  onVote: (noteId: string) => void;
}

export function StickyNote({
  note,
  voteCount,
  hasVoted,
  authorName,
  onVote,
}: StickyNoteProps) {
  const bgColor = note.color ?? '#FEF3C7';

  return (
    <div
      className="rounded-lg p-3 shadow-sm transition-shadow hover:shadow-md"
      style={{ backgroundColor: bgColor }}
    >
      <p className="text-sm text-gray-900 whitespace-pre-wrap break-words">
        {note.text}
      </p>

      <div className="mt-3 flex items-center justify-between">
        {!note.isAnonymous && authorName ? (
          <span className="text-xs text-gray-600">{authorName}</span>
        ) : (
          <span className="text-xs text-gray-500 italic">Anónimo</span>
        )}

        <Button
          variant="ghost"
          size="sm"
          className={cn(
            'h-7 gap-1 px-2',
            hasVoted && 'text-primary font-semibold',
          )}
          onClick={() => onVote(note.id)}
        >
          <ThumbsUp className={cn('h-3.5 w-3.5', hasVoted && 'fill-current')} />
          <span className="text-xs">{voteCount}</span>
        </Button>
      </div>
    </div>
  );
}
