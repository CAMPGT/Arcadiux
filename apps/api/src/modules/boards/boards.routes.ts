import type { FastifyInstance } from "fastify";
import { z } from "zod";
import * as boardService from "./boards.service.js";

export async function boardRoutes(app: FastifyInstance) {
  app.addHook("onRequest", app.authenticate);

  // GET /projects/:projectKey/board
  app.get(
    "/:projectKey/board",
    {
      onRequest: [app.requireRole(["admin", "member", "viewer"])],
      schema: {
        params: z.object({ projectKey: z.string() }),
        querystring: z.object({
          sprintId: z.string().uuid().optional(),
        }),
      },
    },
    async (request, reply) => {
      const query = request.query as { sprintId?: string };
      const result = await boardService.getBoardView(
        request.projectId!,
        query.sprintId,
      );
      return reply.send({ success: true, data: result });
    },
  );
}
