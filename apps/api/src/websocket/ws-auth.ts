import type { Socket } from "socket.io";
import { createVerifier } from "fast-jwt";
import { config } from "../config/index.js";
import type { JwtPayload } from "../plugins/auth.plugin.js";

const verify = createVerifier({ key: async () => config.JWT_SECRET });

export function authenticateSocket(
  socket: Socket,
  next: (err?: Error) => void,
): void {
  const token =
    socket.handshake.auth?.token ||
    socket.handshake.headers?.authorization?.replace("Bearer ", "");

  if (!token) {
    return next(new Error("Authentication required"));
  }

  verify(token)
    .then((decoded: JwtPayload) => {
      socket.data.userId = decoded.sub;
      socket.data.email = decoded.email;
      socket.data.fullName = decoded.fullName;
      next();
    })
    .catch(() => {
      next(new Error("Invalid or expired token"));
    });
}
