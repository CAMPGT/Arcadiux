'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  ApiResponse,
  RetroBoard,
  RetroColumn as RetroColumnType,
  RetroNote,
  RetroVote,
  User,
} from '@arcadiux/shared/types';
import { apiClient, getToken } from '@/lib/api-client';
import { RetroColumn } from '@/components/retro/retro-column';
import { Timer } from '@/components/retro/timer';
import { CursorOverlay, getCursorColor } from '@/components/retro/cursor-overlay';
import {
  connectSocket,
  disconnectSocket,
  joinRetroRoom,
  leaveRetroRoom,
  emitAddNote,
  emitVote,
  emitTimerToggle,
  emitCursorMove,
  getSocket,
} from '@/lib/socket';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Users } from 'lucide-react';
import Link from 'next/link';

interface CursorState {
  userId: string;
  userName: string;
  x: number;
  y: number;
  color: string;
}

export default function RetroSessionPage() {
  const params = useParams<{ projectId: string; retroId: string }>();
  const projectId = params?.projectId ?? '';
  const retroId = params?.retroId ?? '';
  const queryClient = useQueryClient();
  const [cursors, setCursors] = useState<CursorState[]>([]);
  const [connectedUsers, setConnectedUsers] = useState<string[]>([]);
  const cursorIndexRef = useRef(0);

  const { data: board } = useQuery({
    queryKey: ['retro', retroId],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<RetroBoard>>(
        `/api/projects/${projectId}/retros/${retroId}`,
      );
      return res.data;
    },
    enabled: !!retroId,
  });

  const { data: columns } = useQuery({
    queryKey: ['retro', retroId, 'columns'],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<RetroColumnType[]>>(
        `/api/projects/${projectId}/retros/${retroId}/columns`,
      );
      return res.data;
    },
    enabled: !!retroId,
  });

  const { data: notes } = useQuery({
    queryKey: ['retro', retroId, 'notes'],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<RetroNote[]>>(
        `/api/projects/${projectId}/retros/${retroId}/notes`,
      );
      return res.data;
    },
    enabled: !!retroId,
  });

  const { data: votes } = useQuery({
    queryKey: ['retro', retroId, 'votes'],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<RetroVote[]>>(
        `/api/projects/${projectId}/retros/${retroId}/votes`,
      );
      return res.data;
    },
    enabled: !!retroId,
  });

  const { data: membersData } = useQuery({
    queryKey: ['project', projectId, 'members-list'],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<User[]>>(
        `/api/projects/${projectId}/members`,
      );
      return res.data;
    },
    enabled: !!projectId,
  });

  const membersNameMap: Record<string, string> = {};
  membersData?.forEach((m) => {
    membersNameMap[m.id] = m.fullName;
  });

  // Current user ID (from JWT)
  const currentUserId = ''; // Will be populated from token decode

  // Socket connection
  useEffect(() => {
    if (!retroId) return;

    const socket = connectSocket();
    joinRetroRoom(retroId);

    socket.on('retro:note:added', () => {
      queryClient.invalidateQueries({
        queryKey: ['retro', retroId, 'notes'],
      });
    });

    socket.on('retro:note:updated', () => {
      queryClient.invalidateQueries({
        queryKey: ['retro', retroId, 'notes'],
      });
    });

    socket.on('retro:voted', () => {
      queryClient.invalidateQueries({
        queryKey: ['retro', retroId, 'votes'],
      });
    });

    socket.on('retro:timer:updated', () => {
      queryClient.invalidateQueries({
        queryKey: ['retro', retroId],
      });
    });

    socket.on('retro:cursor:moved', (data: { userId: string; userName: string; x: number; y: number }) => {
      setCursors((prev) => {
        const existing = prev.findIndex((c) => c.userId === data.userId);
        const color = getCursorColor(existing >= 0 ? existing : cursorIndexRef.current++);
        if (existing >= 0) {
          const updated = [...prev];
          updated[existing] = { ...data, color };
          return updated;
        }
        return [...prev, { ...data, color }];
      });
    });

    socket.on('retro:user:joined', (data: { userId: string }) => {
      setConnectedUsers((prev) =>
        prev.includes(data.userId) ? prev : [...prev, data.userId],
      );
    });

    socket.on('retro:user:left', (data: { userId: string }) => {
      setConnectedUsers((prev) => prev.filter((id) => id !== data.userId));
      setCursors((prev) => prev.filter((c) => c.userId !== data.userId));
    });

    return () => {
      leaveRetroRoom(retroId);
      disconnectSocket();
    };
  }, [retroId, queryClient]);

  // Cursor tracking
  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      emitCursorMove(retroId, e.clientX, e.clientY);
    },
    [retroId],
  );

  const handleAddNote = (columnId: string, text: string) => {
    emitAddNote(retroId, columnId, text);
  };

  const handleVote = (noteId: string) => {
    emitVote(retroId, noteId);
  };

  const handleTimerToggle = () => {
    emitTimerToggle(retroId);
  };

  const sortedColumns = columns
    ? [...columns].sort((a, b) => a.position - b.position)
    : [];

  return (
    <div className="space-y-4" onMouseMove={handleMouseMove}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/projects/${projectId}/retro`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h2 className="text-lg font-semibold">
              {board?.name ?? 'Cargando...'}
            </h2>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Users className="h-3.5 w-3.5" />
              <span>
                {connectedUsers.length + 1} participante
                {connectedUsers.length !== 0 ? 's' : ''}
              </span>
            </div>
          </div>
        </div>

        {board && (
          <Timer
            initialSeconds={board.timerSeconds}
            isRunning={board.timerRunning}
            startedAt={board.timerStartedAt}
            onToggle={handleTimerToggle}
          />
        )}
      </div>

      {/* Columns */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {sortedColumns.map((column) => {
          const columnNotes = notes
            ? notes
                .filter((n) => n.columnId === column.id)
                .sort((a, b) => a.position - b.position)
            : [];

          return (
            <RetroColumn
              key={column.id}
              column={column}
              notes={columnNotes}
              votes={votes ?? []}
              currentUserId={currentUserId}
              members={membersNameMap}
              onAddNote={handleAddNote}
              onVote={handleVote}
            />
          );
        })}

        {sortedColumns.length === 0 && (
          <div className="flex items-center justify-center w-full py-20 text-muted-foreground">
            Cargando tablero de retro...
          </div>
        )}
      </div>

      {/* Cursor Overlay */}
      <CursorOverlay cursors={cursors} />
    </div>
  );
}
