import type { FastifyInstance } from "fastify";
import {
  aiGenerateDescriptionSchema,
  aiBreakDownEpicSchema,
  aiDetectRisksSchema,
} from "@arcadiux/shared/validators";
import type { z } from "zod";
import * as aiService from "./ai.service.js";

export async function aiRoutes(app: FastifyInstance) {
  app.addHook("onRequest", app.authenticate);

  // POST /ai/generate-description
  app.post(
    "/generate-description",
    {
      schema: {
        body: aiGenerateDescriptionSchema,
      },
      config: {
        rateLimit: {
          max: 20,
          timeWindow: "1 minute",
        },
      },
    },
    async (request, reply) => {
      const result = await aiService.generateDescription(
        request.body as z.infer<typeof aiGenerateDescriptionSchema>,
      );
      return reply.send({ success: true, data: result });
    },
  );

  // POST /ai/break-down-epic
  app.post(
    "/break-down-epic",
    {
      schema: {
        body: aiBreakDownEpicSchema,
      },
      config: {
        rateLimit: {
          max: 10,
          timeWindow: "1 minute",
        },
      },
    },
    async (request, reply) => {
      const result = await aiService.breakDownEpic(
        request.body as z.infer<typeof aiBreakDownEpicSchema>,
      );
      return reply.send({ success: true, data: result });
    },
  );

  // POST /ai/detect-risks
  app.post(
    "/detect-risks",
    {
      schema: {
        body: aiDetectRisksSchema,
      },
      config: {
        rateLimit: {
          max: 10,
          timeWindow: "1 minute",
        },
      },
    },
    async (request, reply) => {
      const result = await aiService.detectRisks(
        request.body as z.infer<typeof aiDetectRisksSchema>,
      );
      return reply.send({ success: true, data: result });
    },
  );
}
