import type { FastifyInstance } from "fastify";
import { z } from "zod";
import * as responsibleService from "./responsibles.service.js";

const bodySchema = z.object({
  fullName: z.string().min(1).max(255),
  email: z.string().email().max(255).optional(),
  jobTitle: z.string().max(255).optional(),
});

const updateBodySchema = bodySchema.partial();

export async function responsibleRoutes(app: FastifyInstance) {
  app.addHook("onRequest", app.authenticate);

  // GET /projects/:projectKey/responsibles
  app.get(
    "/:projectKey/responsibles",
    {
      onRequest: [app.requireRole(["admin", "member", "viewer"])],
      schema: {
        params: z.object({ projectKey: z.string() }),
      },
    },
    async (request, reply) => {
      const result = await responsibleService.listResponsibles(
        request.projectId!,
      );
      return reply.send({ success: true, data: result });
    },
  );

  // POST /projects/:projectKey/responsibles
  app.post(
    "/:projectKey/responsibles",
    {
      onRequest: [app.requireRole(["admin"])],
      schema: {
        params: z.object({ projectKey: z.string() }),
        body: bodySchema,
      },
    },
    async (request, reply) => {
      const result = await responsibleService.createResponsible(
        request.projectId!,
        request.body as z.infer<typeof bodySchema>,
      );
      return reply.code(201).send({ success: true, data: result });
    },
  );

  // PATCH /projects/:projectKey/responsibles/:responsibleId
  app.patch(
    "/:projectKey/responsibles/:responsibleId",
    {
      onRequest: [app.requireRole(["admin"])],
      schema: {
        params: z.object({
          projectKey: z.string(),
          responsibleId: z.string().uuid(),
        }),
        body: updateBodySchema,
      },
    },
    async (request, reply) => {
      const { responsibleId } = request.params as { responsibleId: string };
      const result = await responsibleService.updateResponsible(
        request.projectId!,
        responsibleId,
        request.body as z.infer<typeof updateBodySchema>,
      );
      return reply.send({ success: true, data: result });
    },
  );

  // DELETE /projects/:projectKey/responsibles/:responsibleId
  app.delete(
    "/:projectKey/responsibles/:responsibleId",
    {
      onRequest: [app.requireRole(["admin"])],
      schema: {
        params: z.object({
          projectKey: z.string(),
          responsibleId: z.string().uuid(),
        }),
      },
    },
    async (request, reply) => {
      const { responsibleId } = request.params as { responsibleId: string };
      await responsibleService.deleteResponsible(
        request.projectId!,
        responsibleId,
      );
      return reply.send({ success: true, data: { deleted: true } });
    },
  );
}
