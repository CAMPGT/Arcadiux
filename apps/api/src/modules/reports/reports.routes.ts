import type { FastifyInstance } from "fastify";
import { z } from "zod";
import * as reportService from "./reports.service.js";

export async function reportRoutes(app: FastifyInstance) {
  app.addHook("onRequest", app.authenticate);

  // GET /projects/:projectKey/reports/burndown
  app.get(
    "/:projectKey/reports/burndown",
    {
      onRequest: [app.requireRole(["admin", "member", "viewer"])],
      schema: {
        params: z.object({ projectKey: z.string() }),
        querystring: z.object({
          sprintId: z.string().uuid(),
        }),
      },
    },
    async (request, reply) => {
      const { sprintId } = request.query as { sprintId: string };
      const result = await reportService.getBurndown(
        request.projectId!,
        sprintId,
      );
      return reply.send({ success: true, data: result });
    },
  );

  // GET /projects/:projectKey/reports/velocity
  app.get(
    "/:projectKey/reports/velocity",
    {
      onRequest: [app.requireRole(["admin", "member", "viewer"])],
      schema: {
        params: z.object({ projectKey: z.string() }),
        querystring: z.object({
          limit: z.coerce.number().int().positive().max(50).default(10),
        }),
      },
    },
    async (request, reply) => {
      const { limit } = request.query as { limit: number };
      const result = await reportService.getVelocity(
        request.projectId!,
        limit,
      );
      return reply.send({ success: true, data: result });
    },
  );

  // GET /projects/:projectKey/reports/sprint-report
  app.get(
    "/:projectKey/reports/sprint-report",
    {
      onRequest: [app.requireRole(["admin", "member", "viewer"])],
      schema: {
        params: z.object({ projectKey: z.string() }),
        querystring: z.object({
          sprintId: z.string().uuid(),
        }),
      },
    },
    async (request, reply) => {
      const { sprintId } = request.query as { sprintId: string };
      const result = await reportService.getSprintReport(
        request.projectId!,
        sprintId,
      );
      return reply.send({ success: true, data: result });
    },
  );
}
