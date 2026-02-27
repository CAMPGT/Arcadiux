import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  createIssueSchema,
  updateIssueSchema,
  transitionIssueSchema,
  issueParamsSchema,
  issueListQuerySchema,
} from "./issues.schemas.js";
import * as issueService from "./issues.service.js";

export async function issueRoutes(app: FastifyInstance) {
  app.addHook("onRequest", app.authenticate);

  // POST /projects/:projectKey/issues
  app.post(
    "/:projectKey/issues",
    {
      onRequest: [app.requireRole(["admin", "member"])],
      schema: {
        params: z.object({ projectKey: z.string() }),
        body: createIssueSchema,
      },
    },
    async (request, reply) => {
      const result = await issueService.createIssue(
        request.projectId!,
        request.body as z.infer<typeof createIssueSchema>,
        request.currentUser.sub,
      );
      return reply.code(201).send({ success: true, data: result });
    },
  );

  // GET /projects/:projectKey/issues
  app.get(
    "/:projectKey/issues",
    {
      onRequest: [app.requireRole(["admin", "member", "viewer"])],
      schema: {
        params: z.object({ projectKey: z.string() }),
        querystring: issueListQuerySchema,
      },
    },
    async (request, reply) => {
      const query = request.query as z.infer<typeof issueListQuerySchema>;
      const result = await issueService.listIssues(
        request.projectId!,
        query,
      );
      return reply.send({ success: true, ...result });
    },
  );

  // GET /projects/:projectKey/issues/:issueIdentifier
  app.get(
    "/:projectKey/issues/:issueIdentifier",
    {
      onRequest: [app.requireRole(["admin", "member", "viewer"])],
      schema: {
        params: issueParamsSchema,
      },
    },
    async (request, reply) => {
      const { issueIdentifier } = request.params as z.infer<typeof issueParamsSchema>;
      const result = await issueService.getByIdentifier(
        request.projectId!,
        issueIdentifier,
      );
      return reply.send({ success: true, data: result });
    },
  );

  // PATCH /projects/:projectKey/issues/:issueIdentifier
  app.patch(
    "/:projectKey/issues/:issueIdentifier",
    {
      onRequest: [app.requireRole(["admin", "member"])],
      schema: {
        params: issueParamsSchema,
        body: updateIssueSchema,
      },
    },
    async (request, reply) => {
      const { issueIdentifier } = request.params as z.infer<typeof issueParamsSchema>;
      const result = await issueService.updateIssue(
        request.projectId!,
        issueIdentifier,
        request.body as z.infer<typeof updateIssueSchema>,
        request.currentUser.sub,
      );
      return reply.send({ success: true, data: result });
    },
  );

  // DELETE /projects/:projectKey/issues/:issueIdentifier
  app.delete(
    "/:projectKey/issues/:issueIdentifier",
    {
      onRequest: [app.requireRole(["admin"])],
      schema: {
        params: issueParamsSchema,
      },
    },
    async (request, reply) => {
      const { issueIdentifier } = request.params as z.infer<typeof issueParamsSchema>;
      await issueService.deleteIssue(request.projectId!, issueIdentifier);
      return reply.send({ success: true, data: { deleted: true } });
    },
  );

  // POST /projects/:projectKey/issues/:issueIdentifier/transitions
  app.post(
    "/:projectKey/issues/:issueIdentifier/transitions",
    {
      onRequest: [app.requireRole(["admin", "member"])],
      schema: {
        params: issueParamsSchema,
        body: transitionIssueSchema,
      },
    },
    async (request, reply) => {
      const { issueIdentifier } = request.params as z.infer<typeof issueParamsSchema>;
      const result = await issueService.transitionIssue(
        request.projectId!,
        issueIdentifier,
        request.body as z.infer<typeof transitionIssueSchema>,
        request.currentUser.sub,
      );
      return reply.send({ success: true, data: result });
    },
  );
}
