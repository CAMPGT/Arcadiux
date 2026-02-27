import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  loginSchema,
  registerSchema,
  refreshTokenSchema,
} from "./auth.schemas.js";
import * as authService from "./auth.service.js";

export async function authRoutes(app: FastifyInstance) {
  // POST /register
  app.post(
    "/register",
    {
      schema: {
        body: registerSchema,
        response: {
          201: z.object({
            success: z.literal(true),
            data: z.object({
              accessToken: z.string(),
              refreshToken: z.string(),
              user: z.object({
                id: z.string(),
                email: z.string(),
                fullName: z.string(),
                avatarUrl: z.string().nullable(),
              }),
            }),
          }),
        },
      },
    },
    async (request, reply) => {
      const result = await authService.register(app, request.body as z.infer<typeof registerSchema>);
      return reply.code(201).send({
        success: true as const,
        data: result,
      });
    },
  );

  // POST /login
  app.post(
    "/login",
    {
      schema: {
        body: loginSchema,
        response: {
          200: z.object({
            success: z.literal(true),
            data: z.object({
              accessToken: z.string(),
              refreshToken: z.string(),
              user: z.object({
                id: z.string(),
                email: z.string(),
                fullName: z.string(),
                avatarUrl: z.string().nullable(),
              }),
            }),
          }),
        },
      },
    },
    async (request, reply) => {
      const result = await authService.login(app, request.body as z.infer<typeof loginSchema>);
      return reply.send({
        success: true as const,
        data: result,
      });
    },
  );

  // POST /refresh
  app.post(
    "/refresh",
    {
      schema: {
        body: refreshTokenSchema,
        response: {
          200: z.object({
            success: z.literal(true),
            data: z.object({
              accessToken: z.string(),
              refreshToken: z.string(),
              user: z.object({
                id: z.string(),
                email: z.string(),
                fullName: z.string(),
                avatarUrl: z.string().nullable(),
              }),
            }),
          }),
        },
      },
    },
    async (request, reply) => {
      const { refreshToken } = request.body as z.infer<typeof refreshTokenSchema>;
      const result = await authService.refresh(app, refreshToken);
      return reply.send({
        success: true as const,
        data: result,
      });
    },
  );

  // GET /me
  app.get(
    "/me",
    {
      onRequest: [app.authenticate],
      schema: {
        response: {
          200: z.object({
            success: z.literal(true),
            data: z.object({
              id: z.string(),
              email: z.string(),
              fullName: z.string(),
              avatarUrl: z.string().nullable(),
              isActive: z.boolean().nullable(),
              createdAt: z.string().nullable(),
              updatedAt: z.string().nullable(),
            }),
          }),
        },
      },
    },
    async (request, reply) => {
      const user = await authService.getMe(request.currentUser.sub);
      return reply.send({
        success: true as const,
        data: user,
      });
    },
  );
}
