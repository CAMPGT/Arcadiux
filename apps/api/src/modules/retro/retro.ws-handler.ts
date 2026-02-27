import type { Server as SocketIOServer, Socket } from "socket.io";
import * as retroService from "./retro.service.js";
import type { CreateRetroNoteInput, UpdateRetroNoteInput } from "@arcadiux/shared/validators";

interface AuthenticatedSocket extends Socket {
  data: {
    userId: string;
    email: string;
    fullName: string;
  };
}

export function registerRetroHandlers(
  io: SocketIOServer,
  socket: AuthenticatedSocket,
) {
  const userId = socket.data.userId;
  const fullName = socket.data.fullName;

  // retro:join - Join a retro board room
  socket.on("retro:join", async (data: { boardId: string }) => {
    const room = `retro:${data.boardId}`;
    await socket.join(room);

    // Notify others that someone joined
    socket.to(room).emit("retro:user:joined", {
      userId,
      fullName,
      boardId: data.boardId,
    });

    // Send current board state to the joining user
    try {
      // We pass projectId as empty since getRetro will find the board by ID
      // The board ID is sufficient for fetching
      socket.emit("retro:joined", {
        boardId: data.boardId,
        userId,
      });
    } catch (err) {
      socket.emit("retro:error", { message: "Failed to join retro board" });
    }
  });

  // retro:leave
  socket.on("retro:leave", async (data: { boardId: string }) => {
    const room = `retro:${data.boardId}`;
    await socket.leave(room);

    socket.to(room).emit("retro:user:left", {
      userId,
      fullName,
      boardId: data.boardId,
    });
  });

  // retro:note:create
  socket.on(
    "retro:note:create",
    async (data: { boardId: string; columnId: string; text: string; color?: string }) => {
      const room = `retro:${data.boardId}`;
      try {
        const note = await retroService.createNote(
          {
            columnId: data.columnId,
            text: data.text,
            color: data.color,
          },
          userId,
        );
        io.to(room).emit("retro:note:created", note);
      } catch (err: any) {
        socket.emit("retro:error", {
          message: err.message || "Failed to create note",
        });
      }
    },
  );

  // retro:note:update
  socket.on(
    "retro:note:update",
    async (data: { boardId: string; noteId: string; text?: string; position?: number }) => {
      const room = `retro:${data.boardId}`;
      try {
        const note = await retroService.updateNote(data.noteId, {
          text: data.text,
          position: data.position,
        });
        io.to(room).emit("retro:note:updated", note);
      } catch (err: any) {
        socket.emit("retro:error", {
          message: err.message || "Failed to update note",
        });
      }
    },
  );

  // retro:note:delete
  socket.on(
    "retro:note:delete",
    async (data: { boardId: string; noteId: string }) => {
      const room = `retro:${data.boardId}`;
      try {
        await retroService.deleteNote(data.noteId);
        io.to(room).emit("retro:note:deleted", { noteId: data.noteId });
      } catch (err: any) {
        socket.emit("retro:error", {
          message: err.message || "Failed to delete note",
        });
      }
    },
  );

  // retro:note:move
  socket.on(
    "retro:note:move",
    async (data: {
      boardId: string;
      noteId: string;
      targetColumnId: string;
      position: number;
    }) => {
      const room = `retro:${data.boardId}`;
      try {
        const note = await retroService.moveNote(
          data.noteId,
          data.targetColumnId,
          data.position,
        );
        io.to(room).emit("retro:note:moved", note);
      } catch (err: any) {
        socket.emit("retro:error", {
          message: err.message || "Failed to move note",
        });
      }
    },
  );

  // retro:vote:toggle
  socket.on(
    "retro:vote:toggle",
    async (data: { boardId: string; noteId: string }) => {
      const room = `retro:${data.boardId}`;
      try {
        const result = await retroService.toggleVote(data.noteId, userId);
        io.to(room).emit("retro:vote:toggled", {
          noteId: data.noteId,
          userId,
          voted: result.voted,
        });
      } catch (err: any) {
        socket.emit("retro:error", {
          message: err.message || "Failed to toggle vote",
        });
      }
    },
  );

  // retro:timer:start
  socket.on(
    "retro:timer:start",
    async (data: { boardId: string }) => {
      const room = `retro:${data.boardId}`;
      try {
        const board = await retroService.startTimer(data.boardId);
        io.to(room).emit("retro:timer:started", {
          boardId: data.boardId,
          timerStartedAt: board.timerStartedAt,
          timerSeconds: board.timerSeconds,
        });
      } catch (err: any) {
        socket.emit("retro:error", {
          message: err.message || "Failed to start timer",
        });
      }
    },
  );

  // retro:timer:stop
  socket.on(
    "retro:timer:stop",
    async (data: { boardId: string }) => {
      const room = `retro:${data.boardId}`;
      try {
        await retroService.stopTimer(data.boardId);
        io.to(room).emit("retro:timer:stopped", {
          boardId: data.boardId,
        });
      } catch (err: any) {
        socket.emit("retro:error", {
          message: err.message || "Failed to stop timer",
        });
      }
    },
  );

  // retro:cursor:move - broadcast cursor position to others
  socket.on(
    "retro:cursor:move",
    (data: { boardId: string; x: number; y: number }) => {
      const room = `retro:${data.boardId}`;
      socket.to(room).emit("retro:cursor:moved", {
        userId,
        fullName,
        x: data.x,
        y: data.y,
      });
    },
  );

  // Handle disconnect
  socket.on("disconnecting", () => {
    for (const room of socket.rooms) {
      if (room.startsWith("retro:")) {
        socket.to(room).emit("retro:user:left", {
          userId,
          fullName,
        });
      }
    }
  });
}
