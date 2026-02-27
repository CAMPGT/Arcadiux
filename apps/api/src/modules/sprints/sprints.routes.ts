import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { createSprintSchema, updateSprintSchema } from "@arcadiux/shared/validators";
import * as sprintService from "./sprints.service.js";

export async function sprintRoutes(app: FastifyInstance) {
  app.addHook("onRequest", app.authenticate);

  // POST /projects/:projectKey/sprints
  app.post(
    "/:projectKey/sprints",
    {
      onRequest: [app.requireRole(["admin", "member"])],
      schema: {
        params: z.object({ projectKey: z.string() }),
        body: createSprintSchema,
      },
    },
    async (request, reply) => {
      const result = await sprintService.createSprint(
        request.projectId!,
        request.body as z.infer<typeof createSprintSchema>,
      );
      return reply.code(201).send({ success: true, data: result });
    },
  );

  // GET /projects/:projectKey/sprints
  app.get(
    "/:projectKey/sprints",
    {
      onRequest: [app.requireRole(["admin", "member", "viewer"])],
      schema: {
        params: z.object({ projectKey: z.string() }),
      },
    },
    async (request, reply) => {
      const result = await sprintService.listSprints(request.projectId!);
      return reply.send({ success: true, data: result });
    },
  );

  // GET /projects/:projectKey/sprints/:sprintId
  app.get(
    "/:projectKey/sprints/:sprintId",
    {
      onRequest: [app.requireRole(["admin", "member", "viewer"])],
      schema: {
        params: z.object({
          projectKey: z.string(),
          sprintId: z.string().uuid(),
        }),
      },
    },
    async (request, reply) => {
      const { sprintId } = request.params as { sprintId: string };
      const result = await sprintService.getSprint(
        request.projectId!,
        sprintId,
      );
      return reply.send({ success: true, data: result });
    },
  );

  // PATCH /projects/:projectKey/sprints/:sprintId
  app.patch(
    "/:projectKey/sprints/:sprintId",
    {
      onRequest: [app.requireRole(["admin", "member"])],
      schema: {
        params: z.object({
          projectKey: z.string(),
          sprintId: z.string().uuid(),
        }),
        body: updateSprintSchema,
      },
    },
    async (request, reply) => {
      const { sprintId } = request.params as { sprintId: string };
      const result = await sprintService.updateSprint(
        request.projectId!,
        sprintId,
        request.body as z.infer<typeof updateSprintSchema>,
      );
      return reply.send({ success: true, data: result });
    },
  );

  // DELETE /projects/:projectKey/sprints/:sprintId
  app.delete(
    "/:projectKey/sprints/:sprintId",
    {
      onRequest: [app.requireRole(["admin"])],
      schema: {
        params: z.object({
          projectKey: z.string(),
          sprintId: z.string().uuid(),
        }),
      },
    },
    async (request, reply) => {
      const { sprintId } = request.params as { sprintId: string };
      await sprintService.deleteSprint(request.projectId!, sprintId);
      return reply.send({ success: true, data: { deleted: true } });
    },
  );

  // POST /projects/:projectKey/sprints/:sprintId/start
  app.post(
    "/:projectKey/sprints/:sprintId/start",
    {
      onRequest: [app.requireRole(["admin", "member"])],
      schema: {
        params: z.object({
          projectKey: z.string(),
          sprintId: z.string().uuid(),
        }),
      },
    },
    async (request, reply) => {
      const { sprintId } = request.params as { sprintId: string };
      const result = await sprintService.startSprint(
        request.projectId!,
        sprintId,
      );
      return reply.send({ success: true, data: result });
    },
  );

  // POST /projects/:projectKey/sprints/:sprintId/complete
  app.post(
    "/:projectKey/sprints/:sprintId/complete",
    {
      onRequest: [app.requireRole(["admin", "member"])],
      schema: {
        params: z.object({
          projectKey: z.string(),
          sprintId: z.string().uuid(),
        }),
        body: z.object({
          moveToSprintId: z.string().uuid().optional(),
        }).optional(),
      },
    },
    async (request, reply) => {
      const { sprintId } = request.params as { sprintId: string };
      const body = request.body as { moveToSprintId?: string } | undefined;
      const result = await sprintService.completeSprint(
        request.projectId!,
        sprintId,
        body?.moveToSprintId,
      );
      return reply.send({ success: true, data: result });
    },
  );
}
