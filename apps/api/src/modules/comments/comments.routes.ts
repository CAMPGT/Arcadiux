import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { createCommentSchema } from "@arcadiux/shared/validators";
import * as commentService from "./comments.service.js";

export async function commentRoutes(app: FastifyInstance) {
  app.addHook("onRequest", app.authenticate);

  // POST /projects/:projectKey/issues/:issueNumber/comments
  app.post(
    "/:projectKey/issues/:issueNumber/comments",
    {
      onRequest: [app.requireRole(["admin", "member"])],
      schema: {
        params: z.object({
          projectKey: z.string(),
          issueNumber: z.coerce.number().int().positive(),
        }),
        body: createCommentSchema,
      },
    },
    async (request, reply) => {
      const { issueNumber } = request.params as { issueNumber: number };
      const result = await commentService.createComment(
        request.projectId!,
        issueNumber,
        request.body as z.infer<typeof createCommentSchema>,
        request.currentUser.sub,
      );
      return reply.code(201).send({ success: true, data: result });
    },
  );

  // GET /projects/:projectKey/issues/:issueNumber/comments
  app.get(
    "/:projectKey/issues/:issueNumber/comments",
    {
      onRequest: [app.requireRole(["admin", "member", "viewer"])],
      schema: {
        params: z.object({
          projectKey: z.string(),
          issueNumber: z.coerce.number().int().positive(),
        }),
      },
    },
    async (request, reply) => {
      const { issueNumber } = request.params as { issueNumber: number };
      const result = await commentService.listComments(
        request.projectId!,
        issueNumber,
      );
      return reply.send({ success: true, data: result });
    },
  );

  // PATCH /projects/:projectKey/issues/:issueNumber/comments/:commentId
  app.patch(
    "/:projectKey/issues/:issueNumber/comments/:commentId",
    {
      onRequest: [app.requireRole(["admin", "member"])],
      schema: {
        params: z.object({
          projectKey: z.string(),
          issueNumber: z.coerce.number().int().positive(),
          commentId: z.string().uuid(),
        }),
        body: createCommentSchema,
      },
    },
    async (request, reply) => {
      const { commentId } = request.params as { commentId: string };
      const { body } = request.body as { body: string };
      const result = await commentService.updateComment(
        commentId,
        body,
        request.currentUser.sub,
      );
      return reply.send({ success: true, data: result });
    },
  );

  // DELETE /projects/:projectKey/issues/:issueNumber/comments/:commentId
  app.delete(
    "/:projectKey/issues/:issueNumber/comments/:commentId",
    {
      onRequest: [app.requireRole(["admin", "member"])],
      schema: {
        params: z.object({
          projectKey: z.string(),
          issueNumber: z.coerce.number().int().positive(),
          commentId: z.string().uuid(),
        }),
      },
    },
    async (request, reply) => {
      const { commentId } = request.params as { commentId: string };
      await commentService.deleteComment(
        commentId,
        request.currentUser.sub,
      );
      return reply.send({ success: true, data: { deleted: true } });
    },
  );

  // GET /projects/:projectKey/issues/:issueNumber/activity
  app.get(
    "/:projectKey/issues/:issueNumber/activity",
    {
      onRequest: [app.requireRole(["admin", "member", "viewer"])],
      schema: {
        params: z.object({
          projectKey: z.string(),
          issueNumber: z.coerce.number().int().positive(),
        }),
      },
    },
    async (request, reply) => {
      const { issueNumber } = request.params as { issueNumber: number };
      const result = await commentService.getActivity(
        request.projectId!,
        issueNumber,
      );
      return reply.send({ success: true, data: result });
    },
  );
}
