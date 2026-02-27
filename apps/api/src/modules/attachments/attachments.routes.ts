import type { FastifyInstance } from "fastify";
import { z } from "zod";
import * as attachmentService from "./attachments.service.js";

export async function attachmentRoutes(app: FastifyInstance) {
  app.addHook("onRequest", app.authenticate);

  // POST /projects/:projectKey/issues/:issueNumber/attachments
  app.post(
    "/:projectKey/issues/:issueNumber/attachments",
    {
      onRequest: [app.requireRole(["admin", "member"])],
      schema: {
        params: z.object({
          projectKey: z.string(),
          issueNumber: z.coerce.number().int().positive(),
        }),
      },
    },
    async (request, reply) => {
      const { issueNumber } = request.params as { issueNumber: number };

      const multipartFile = await request.file();

      if (!multipartFile) {
        return reply.code(400).send({
          success: false,
          message: "No file uploaded",
        });
      }

      const buffer = await multipartFile.toBuffer();

      const result = await attachmentService.uploadAttachment(
        request.projectId!,
        issueNumber,
        {
          filename: multipartFile.filename,
          mimetype: multipartFile.mimetype,
          data: buffer,
        },
        request.currentUser.sub,
      );

      return reply.code(201).send({ success: true, data: result });
    },
  );

  // GET /projects/:projectKey/issues/:issueNumber/attachments
  app.get(
    "/:projectKey/issues/:issueNumber/attachments",
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
      const result = await attachmentService.listAttachments(
        request.projectId!,
        issueNumber,
      );
      return reply.send({ success: true, data: result });
    },
  );

  // DELETE /projects/:projectKey/issues/:issueNumber/attachments/:attachmentId
  app.delete(
    "/:projectKey/issues/:issueNumber/attachments/:attachmentId",
    {
      onRequest: [app.requireRole(["admin", "member"])],
      schema: {
        params: z.object({
          projectKey: z.string(),
          issueNumber: z.coerce.number().int().positive(),
          attachmentId: z.string().uuid(),
        }),
      },
    },
    async (request, reply) => {
      const { attachmentId } = request.params as { attachmentId: string };
      await attachmentService.deleteAttachment(
        attachmentId,
        request.currentUser.sub,
      );
      return reply.send({ success: true, data: { deleted: true } });
    },
  );
}
