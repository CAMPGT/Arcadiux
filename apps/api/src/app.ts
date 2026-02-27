import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import jwt from "@fastify/jwt";
import multipart from "@fastify/multipart";
import {
  serializerCompiler,
  validatorCompiler,
} from "fastify-type-provider-zod";

import { config } from "./config/index.js";
import { authPlugin } from "./plugins/auth.plugin.js";
import { rbacPlugin } from "./plugins/rbac.plugin.js";
import { errorHandlerPlugin } from "./plugins/error-handler.plugin.js";
import { authRoutes } from "./modules/auth/auth.routes.js";
import { projectRoutes } from "./modules/projects/projects.routes.js";
import { issueRoutes } from "./modules/issues/issues.routes.js";
import { workflowRoutes } from "./modules/workflows/workflows.routes.js";
import { sprintRoutes } from "./modules/sprints/sprints.routes.js";
import { boardRoutes } from "./modules/boards/boards.routes.js";
import { backlogRoutes } from "./modules/backlog/backlog.routes.js";
import { retroRoutes } from "./modules/retro/retro.routes.js";
import { reportRoutes } from "./modules/reports/reports.routes.js";
import { commentRoutes } from "./modules/comments/comments.routes.js";
import { attachmentRoutes } from "./modules/attachments/attachments.routes.js";
import { searchRoutes } from "./modules/search/search.routes.js";
import { responsibleRoutes } from "./modules/responsibles/responsibles.routes.js";
import { aiRoutes } from "./modules/ai/ai.routes.js";
import { setupWebSocket } from "./websocket/ws-server.js";
import { setupEventHandlers } from "./events/handlers.js";

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: process.env.NODE_ENV === "production" ? "info" : "debug",
      transport:
        process.env.NODE_ENV !== "production"
          ? { target: "pino-pretty", options: { colorize: true } }
          : undefined,
    },
  });

  // Set Zod as the schema validator/serializer
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  // Register core plugins
  await app.register(cors, {
    origin: config.CORS_ORIGIN.split(",").map((o) => o.trim()),
    credentials: true,
  });

  await app.register(helmet, {
    contentSecurityPolicy: false,
  });

  await app.register(rateLimit, {
    max: 100,
    timeWindow: "1 minute",
  });

  await app.register(jwt, {
    secret: config.JWT_SECRET,
    sign: {
      expiresIn: "15m",
    },
  });

  await app.register(multipart, {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10 MB
      files: 5,
    },
  });

  // Register custom plugins
  await app.register(errorHandlerPlugin);
  await app.register(authPlugin);
  await app.register(rbacPlugin);

  // Register module routes under /api/v1
  await app.register(
    async function apiV1(api) {
      await api.register(authRoutes, { prefix: "/auth" });
      await api.register(projectRoutes, { prefix: "/projects" });
      await api.register(issueRoutes, { prefix: "/projects" });
      await api.register(workflowRoutes, { prefix: "/projects" });
      await api.register(sprintRoutes, { prefix: "/projects" });
      await api.register(boardRoutes, { prefix: "/projects" });
      await api.register(backlogRoutes, { prefix: "/projects" });
      await api.register(retroRoutes, { prefix: "/projects" });
      await api.register(reportRoutes, { prefix: "/projects" });
      await api.register(commentRoutes, { prefix: "/projects" });
      await api.register(attachmentRoutes, { prefix: "/projects" });
      await api.register(responsibleRoutes, { prefix: "/projects" });
      await api.register(searchRoutes, { prefix: "/search" });
      await api.register(aiRoutes, { prefix: "/ai" });
    },
    { prefix: "/api/v1" },
  );

  // Health check
  app.get("/health", async () => ({ status: "ok", timestamp: new Date().toISOString() }));

  // Setup internal event handlers for activity logging
  setupEventHandlers();

  return app;
}
