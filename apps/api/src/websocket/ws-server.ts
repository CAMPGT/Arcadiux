import { Server as SocketIOServer } from "socket.io";
import type { Server as HttpServer } from "node:http";
import { config } from "../config/index.js";
import { authenticateSocket } from "./ws-auth.js";
import { registerRetroHandlers } from "../modules/retro/retro.ws-handler.js";

export function setupWebSocket(httpServer: HttpServer): SocketIOServer {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: config.CORS_ORIGIN.split(",").map((o) => o.trim()),
      credentials: true,
    },
  });

  // Create a /retro namespace for retrospective real-time features
  const retroNamespace = io.of("/retro");

  // Apply authentication middleware
  retroNamespace.use(authenticateSocket);

  retroNamespace.on("connection", (socket) => {
    console.log(
      `WebSocket connected: ${socket.data.userId} (${socket.data.fullName})`,
    );

    // Register retro-specific event handlers
    registerRetroHandlers(io, socket as any);

    socket.on("disconnect", (reason) => {
      console.log(
        `WebSocket disconnected: ${socket.data.userId} (reason: ${reason})`,
      );
    });

    socket.on("error", (err) => {
      console.error(`WebSocket error for user ${socket.data.userId}`, err);
    });
  });

  // Default namespace for general notifications
  io.use(authenticateSocket);

  io.on("connection", (socket) => {
    // Join a personal room for targeted notifications
    const userId = socket.data.userId;
    if (userId) {
      socket.join(`user:${userId}`);
    }

    socket.on("disconnect", () => {
      // Clean up
    });
  });

  console.log("WebSocket server initialized");
  return io;
}
