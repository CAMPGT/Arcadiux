import { io, type Socket } from 'socket.io-client';
import { getToken } from './api-client';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? 'http://localhost:4000';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(`${WS_URL}/retro`, {
      autoConnect: false,
      auth: (cb) => {
        const token = getToken();
        cb({ token });
      },
      transports: ['websocket', 'polling'],
    });
  }
  return socket;
}

export function connectSocket(): Socket {
  const s = getSocket();
  if (!s.connected) {
    s.connect();
  }
  return s;
}

export function disconnectSocket(): void {
  if (socket?.connected) {
    socket.disconnect();
  }
}

export function joinRetroRoom(boardId: string): void {
  const s = getSocket();
  s.emit('retro:join', { boardId });
}

export function leaveRetroRoom(boardId: string): void {
  const s = getSocket();
  s.emit('retro:leave', { boardId });
}

export function emitCursorMove(boardId: string, x: number, y: number): void {
  const s = getSocket();
  s.emit('retro:cursor', { boardId, x, y });
}

export function emitAddNote(boardId: string, columnId: string, text: string, color?: string): void {
  const s = getSocket();
  s.emit('retro:note:add', { boardId, columnId, text, color });
}

export function emitVote(boardId: string, noteId: string): void {
  const s = getSocket();
  s.emit('retro:vote', { boardId, noteId });
}

export function emitTimerToggle(boardId: string): void {
  const s = getSocket();
  s.emit('retro:timer:toggle', { boardId });
}
