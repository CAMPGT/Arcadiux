import type { FastifyInstance } from "fastify";
import { z } from "zod";
import * as workflowService from "./workflows.service.js";

const statusBodySchema = z.object({
  name: z.string().min(1).max(50),
  category: z.enum(["todo", "in_progress", "done"]),
  position: z.number().int().min(0).optional(),
  wipLimit: z.number().int().min(1).nullable().optional(),
  isActive: z.boolean().optional(),
});

const updateStatusBodySchema = statusBodySchema.partial();

const transitionBodySchema = z.object({
  fromStatusId: z.string().uuid(),
  toStatusId: z.string().uuid(),
});

export async function workflowRoutes(app: FastifyInstance) {
  app.addHook("onRequest", app.authenticate);

  // GET /projects/:projectKey/statuses
  app.get(
    "/:projectKey/statuses",
    {
      onRequest: [app.requireRole(["admin", "member", "viewer"])],
      schema: {
        params: z.object({ projectKey: z.string() }),
      },
    },
    async (request, reply) => {
      const result = await workflowService.listStatuses(request.projectId!);
      return reply.send({ success: true, data: result });
    },
  );

  // POST /projects/:projectKey/statuses
  app.post(
    "/:projectKey/statuses",
    {
      onRequest: [app.requireRole(["admin"])],
      schema: {
        params: z.object({ projectKey: z.string() }),
        body: statusBodySchema,
      },
    },
    async (request, reply) => {
      const result = await workflowService.createStatus(
        request.projectId!,
        request.body as z.infer<typeof statusBodySchema>,
      );
      return reply.code(201).send({ success: true, data: result });
    },
  );

  // PATCH /projects/:projectKey/statuses/:statusId
  app.patch(
    "/:projectKey/statuses/:statusId",
    {
      onRequest: [app.requireRole(["admin"])],
      schema: {
        params: z.object({
          projectKey: z.string(),
          statusId: z.string().uuid(),
        }),
        body: updateStatusBodySchema,
      },
    },
    async (request, reply) => {
      const { statusId } = request.params as { statusId: string };
      const result = await workflowService.updateStatus(
        request.projectId!,
        statusId,
        request.body as z.infer<typeof updateStatusBodySchema>,
      );
      return reply.send({ success: true, data: result });
    },
  );

  // DELETE /projects/:projectKey/statuses/:statusId
  app.delete(
    "/:projectKey/statuses/:statusId",
    {
      onRequest: [app.requireRole(["admin"])],
      schema: {
        params: z.object({
          projectKey: z.string(),
          statusId: z.string().uuid(),
        }),
      },
    },
    async (request, reply) => {
      const { statusId } = request.params as { statusId: string };
      await workflowService.deleteStatus(request.projectId!, statusId);
      return reply.send({ success: true, data: { deleted: true } });
    },
  );

  // GET /projects/:projectKey/transitions
  app.get(
    "/:projectKey/transitions",
    {
      onRequest: [app.requireRole(["admin", "member", "viewer"])],
      schema: {
        params: z.object({ projectKey: z.string() }),
      },
    },
    async (request, reply) => {
      const result = await workflowService.listTransitions(
        request.projectId!,
      );
      return reply.send({ success: true, data: result });
    },
  );

  // POST /projects/:projectKey/transitions
  app.post(
    "/:projectKey/transitions",
    {
      onRequest: [app.requireRole(["admin"])],
      schema: {
        params: z.object({ projectKey: z.string() }),
        body: transitionBodySchema,
      },
    },
    async (request, reply) => {
      const result = await workflowService.createTransition(
        request.projectId!,
        request.body as z.infer<typeof transitionBodySchema>,
      );
      return reply.code(201).send({ success: true, data: result });
    },
  );

  // DELETE /projects/:projectKey/transitions/:transitionId
  app.delete(
    "/:projectKey/transitions/:transitionId",
    {
      onRequest: [app.requireRole(["admin"])],
      schema: {
        params: z.object({
          projectKey: z.string(),
          transitionId: z.string().uuid(),
        }),
      },
    },
    async (request, reply) => {
      const { transitionId } = request.params as { transitionId: string };
      await workflowService.deleteTransition(
        request.projectId!,
        transitionId,
      );
      return reply.send({ success: true, data: { deleted: true } });
    },
  );
}
