import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { reorderSchema } from "@arcadiux/shared/validators";
import * as backlogService from "./backlog.service.js";

export async function backlogRoutes(app: FastifyInstance) {
  app.addHook("onRequest", app.authenticate);

  // GET /projects/:projectKey/backlog
  app.get(
    "/:projectKey/backlog",
    {
      onRequest: [app.requireRole(["admin", "member", "viewer"])],
      schema: {
        params: z.object({ projectKey: z.string() }),
      },
    },
    async (request, reply) => {
      const result = await backlogService.getBacklog(request.projectId!);
      return reply.send({ success: true, data: result });
    },
  );

  // PATCH /projects/:projectKey/backlog/reorder
  app.patch(
    "/:projectKey/backlog/reorder",
    {
      onRequest: [app.requireRole(["admin", "member"])],
      schema: {
        params: z.object({ projectKey: z.string() }),
        body: reorderSchema,
      },
    },
    async (request, reply) => {
      const result = await backlogService.reorderBacklog(
        request.projectId!,
        request.body as z.infer<typeof reorderSchema>,
      );
      return reply.send({ success: true, data: result });
    },
  );

  // POST /projects/:projectKey/backlog/move-to-sprint
  app.post(
    "/:projectKey/backlog/move-to-sprint",
    {
      onRequest: [app.requireRole(["admin", "member"])],
      schema: {
        params: z.object({ projectKey: z.string() }),
        body: z.object({
          issueIds: z.array(z.string().uuid()).min(1),
          sprintId: z.string().uuid(),
        }),
      },
    },
    async (request, reply) => {
      const { issueIds, sprintId } = request.body as {
        issueIds: string[];
        sprintId: string;
      };
      const result = await backlogService.moveToSprint(
        request.projectId!,
        issueIds,
        sprintId,
      );
      return reply.send({ success: true, data: result });
    },
  );

  // POST /projects/:projectKey/backlog/move-to-backlog
  app.post(
    "/:projectKey/backlog/move-to-backlog",
    {
      onRequest: [app.requireRole(["admin", "member"])],
      schema: {
        params: z.object({ projectKey: z.string() }),
        body: z.object({
          issueIds: z.array(z.string().uuid()).min(1),
        }),
      },
    },
    async (request, reply) => {
      const { issueIds } = request.body as { issueIds: string[] };
      const result = await backlogService.moveToBacklog(
        request.projectId!,
        issueIds,
      );
      return reply.send({ success: true, data: result });
    },
  );
}
