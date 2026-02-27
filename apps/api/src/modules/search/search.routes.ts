import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { searchSchema } from "@arcadiux/shared/validators";
import { fullTextSearch } from "../issues/issues.search.js";

export async function searchRoutes(app: FastifyInstance) {
  app.addHook("onRequest", app.authenticate);

  // GET /search
  app.get(
    "/",
    {
      schema: {
        querystring: searchSchema.extend({
          limit: z.coerce.number().int().positive().max(100).default(50),
        }),
      },
    },
    async (request, reply) => {
      const { q, projectKey, limit } = request.query as {
        q: string;
        projectKey?: string;
        limit: number;
      };

      const results = await fullTextSearch(
        q,
        projectKey,
        request.currentUser.sub,
        limit,
      );

      return reply.send({
        success: true,
        data: results,
        query: q,
        count: results.length,
      });
    },
  );
}
