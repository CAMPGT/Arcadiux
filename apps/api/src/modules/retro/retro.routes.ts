import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { createRetroSchema, createRetroNoteSchema } from "@arcadiux/shared/validators";
import * as retroService from "./retro.service.js";

export async function retroRoutes(app: FastifyInstance) {
  app.addHook("onRequest", app.authenticate);

  // POST /projects/:projectKey/retros
  app.post(
    "/:projectKey/retros",
    {
      onRequest: [app.requireRole(["admin", "member"])],
      schema: {
        params: z.object({ projectKey: z.string() }),
        body: createRetroSchema.extend({
          sprintId: z.string().uuid().optional(),
        }),
      },
    },
    async (request, reply) => {
      const body = request.body as z.infer<typeof createRetroSchema> & {
        sprintId?: string;
      };
      const result = await retroService.createRetro(
        request.projectId!,
        body,
        body.sprintId,
      );
      return reply.code(201).send({ success: true, data: result });
    },
  );

  // GET /projects/:projectKey/retros
  app.get(
    "/:projectKey/retros",
    {
      onRequest: [app.requireRole(["admin", "member", "viewer"])],
      schema: {
        params: z.object({ projectKey: z.string() }),
      },
    },
    async (request, reply) => {
      const result = await retroService.listRetros(request.projectId!);
      return reply.send({ success: true, data: result });
    },
  );

  // GET /projects/:projectKey/retros/:boardId
  app.get(
    "/:projectKey/retros/:boardId",
    {
      onRequest: [app.requireRole(["admin", "member", "viewer"])],
      schema: {
        params: z.object({
          projectKey: z.string(),
          boardId: z.string().uuid(),
        }),
      },
    },
    async (request, reply) => {
      const { boardId } = request.params as { boardId: string };
      const result = await retroService.getRetro(
        request.projectId!,
        boardId,
      );
      return reply.send({ success: true, data: result });
    },
  );

  // PATCH /projects/:projectKey/retros/:boardId
  app.patch(
    "/:projectKey/retros/:boardId",
    {
      onRequest: [app.requireRole(["admin", "member"])],
      schema: {
        params: z.object({
          projectKey: z.string(),
          boardId: z.string().uuid(),
        }),
        body: z.object({
          name: z.string().min(1).max(255).optional(),
          timerSeconds: z.number().int().min(0).optional(),
          maxVotes: z.number().int().min(0).optional(),
          isAnonymous: z.boolean().optional(),
        }),
      },
    },
    async (request, reply) => {
      const { boardId } = request.params as { boardId: string };
      const result = await retroService.updateRetro(
        request.projectId!,
        boardId,
        request.body as any,
      );
      return reply.send({ success: true, data: result });
    },
  );

  // DELETE /projects/:projectKey/retros/:boardId
  app.delete(
    "/:projectKey/retros/:boardId",
    {
      onRequest: [app.requireRole(["admin"])],
      schema: {
        params: z.object({
          projectKey: z.string(),
          boardId: z.string().uuid(),
        }),
      },
    },
    async (request, reply) => {
      const { boardId } = request.params as { boardId: string };
      await retroService.deleteRetro(request.projectId!, boardId);
      return reply.send({ success: true, data: { deleted: true } });
    },
  );

  // POST /projects/:projectKey/retros/:boardId/notes/:noteId/action-item
  app.post(
    "/:projectKey/retros/:boardId/notes/:noteId/action-item",
    {
      onRequest: [app.requireRole(["admin", "member"])],
      schema: {
        params: z.object({
          projectKey: z.string(),
          boardId: z.string().uuid(),
          noteId: z.string().uuid(),
        }),
        body: z.object({
          assigneeId: z.string().uuid().optional(),
        }).optional(),
      },
    },
    async (request, reply) => {
      const { boardId, noteId } = request.params as {
        boardId: string;
        noteId: string;
      };
      const body = request.body as { assigneeId?: string } | undefined;
      const result = await retroService.convertNoteToActionItem(
        boardId,
        noteId,
        body?.assigneeId,
      );
      return reply.code(201).send({ success: true, data: result });
    },
  );

  // POST /projects/:projectKey/retros/:boardId/action-items/:actionItemId/to-issue
  app.post(
    "/:projectKey/retros/:boardId/action-items/:actionItemId/to-issue",
    {
      onRequest: [app.requireRole(["admin", "member"])],
      schema: {
        params: z.object({
          projectKey: z.string(),
          boardId: z.string().uuid(),
          actionItemId: z.string().uuid(),
        }),
      },
    },
    async (request, reply) => {
      const { actionItemId } = request.params as { actionItemId: string };
      const result = await retroService.convertActionItemToIssue(
        actionItemId,
        request.projectId!,
        request.currentUser.sub,
      );
      return reply.code(201).send({ success: true, data: result });
    },
  );
}
