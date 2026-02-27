'use client';

import React, { useState } from 'react';
import type { RetroColumn as RetroColumnType, RetroNote, RetroVote } from '@arcadiux/shared/types';
import { StickyNote } from './sticky-note';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Plus, X } from 'lucide-react';

interface RetroColumnProps {
  column: RetroColumnType;
  notes: RetroNote[];
  votes: RetroVote[];
  currentUserId: string;
  members: Record<string, string>; // userId -> fullName
  onAddNote: (columnId: string, text: string) => void;
  onVote: (noteId: string) => void;
}

export function RetroColumn({
  column,
  notes,
  votes,
  currentUserId,
  members,
  onAddNote,
  onVote,
}: RetroColumnProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [noteText, setNoteText] = useState('');

  const handleAddNote = () => {
    if (noteText.trim()) {
      onAddNote(column.id, noteText.trim());
      setNoteText('');
      setIsAdding(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAddNote();
    }
    if (e.key === 'Escape') {
      setIsAdding(false);
      setNoteText('');
    }
  };

  const sortedNotes = [...notes].sort((a, b) => {
    const aVotes = votes.filter((v) => v.noteId === a.id).length;
    const bVotes = votes.filter((v) => v.noteId === b.id).length;
    return bVotes - aVotes;
  });

  return (
    <div className="flex w-80 shrink-0 flex-col rounded-lg border bg-background">
      {/* Column Header */}
      <div
        className="flex items-center justify-between rounded-t-lg px-4 py-3"
        style={{ backgroundColor: column.color + '20' }}
      >
        <div className="flex items-center gap-2">
          <div
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: column.color }}
          />
          <h3 className="text-sm font-semibold">{column.name}</h3>
          <span className="text-xs text-muted-foreground">
            ({notes.length})
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => setIsAdding(true)}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Notes */}
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-3">
        {/* Add Note Form */}
        {isAdding && (
          <div className="rounded-lg border bg-card p-2 shadow-sm">
            <Textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Escribe tu nota..."
              rows={3}
              autoFocus
              className="border-0 bg-transparent p-0 text-sm focus-visible:ring-0"
            />
            <div className="mt-2 flex justify-end gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-7"
                onClick={() => {
                  setIsAdding(false);
                  setNoteText('');
                }}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="sm"
                className="h-7"
                onClick={handleAddNote}
                disabled={!noteText.trim()}
              >
                Agregar
              </Button>
            </div>
          </div>
        )}

        {sortedNotes.map((note) => {
          const noteVotes = votes.filter((v) => v.noteId === note.id);
          const hasVoted = noteVotes.some((v) => v.userId === currentUserId);

          return (
            <StickyNote
              key={note.id}
              note={note}
              voteCount={noteVotes.length}
              hasVoted={hasVoted}
              authorName={members[note.authorId]}
              onVote={onVote}
            />
          );
        })}

        {sortedNotes.length === 0 && !isAdding && (
          <div className="flex flex-1 items-center justify-center py-8">
            <p className="text-xs text-muted-foreground">
              Haz clic en + para agregar una nota
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
