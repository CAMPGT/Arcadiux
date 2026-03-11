import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  loginSchema,
  registerSchema,
} from "./auth.schemas.js";
import * as authService from "./auth.service.js";

const REFRESH_COOKIE = "refresh_token";
const REFRESH_COOKIE_PATH = "/api/v1/auth";
const REFRESH_COOKIE_MAX_AGE = 30 * 24 * 60 * 60; // 30 days in seconds

function setRefreshCookie(reply: any, token: string) {
  reply.setCookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: REFRESH_COOKIE_PATH,
    maxAge: REFRESH_COOKIE_MAX_AGE,
  });
}

function clearRefreshCookie(reply: any) {
  reply.clearCookie(REFRESH_COOKIE, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: REFRESH_COOKIE_PATH,
  });
}

export async function authRoutes(app: FastifyInstance) {
  // POST /register
  app.post(
    "/register",
    {
      config: {
        rateLimit: process.env.NODE_ENV === "test"
          ? { max: 10000, timeWindow: "1 minute" }
          : { max: 5, timeWindow: "1 minute" },
      },
      schema: {
        body: registerSchema,
        response: {
          201: z.object({
            success: z.literal(true),
            data: z.object({
              accessToken: z.string(),
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
      const { refreshToken, ...rest } = result;
      setRefreshCookie(reply, refreshToken);
      return reply.code(201).send({
        success: true as const,
        data: rest,
      });
    },
  );

  // POST /login
  app.post(
    "/login",
    {
      config: {
        rateLimit: process.env.NODE_ENV === "test"
          ? { max: 10000, timeWindow: "1 minute" }
          : { max: 5, timeWindow: "1 minute" },
      },
      schema: {
        body: loginSchema,
        response: {
          200: z.object({
            success: z.literal(true),
            data: z.object({
              accessToken: z.string(),
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
      const { refreshToken, ...rest } = result;
      setRefreshCookie(reply, refreshToken);
      return reply.send({
        success: true as const,
        data: rest,
      });
    },
  );

  // POST /refresh — reads refresh token from httpOnly cookie
  app.post(
    "/refresh",
    async (request, reply) => {
      const rawRefreshToken = request.cookies[REFRESH_COOKIE];

      if (!rawRefreshToken) {
        return reply.code(401).send({
          success: false,
          message: "No refresh token",
        });
      }

      const result = await authService.refresh(app, rawRefreshToken);
      const { refreshToken, ...rest } = result;
      setRefreshCookie(reply, refreshToken);
      return reply.send({
        success: true as const,
        data: rest,
      });
    },
  );

  // POST /logout — clears cookie
  app.post(
    "/logout",
    async (_request, reply) => {
      clearRefreshCookie(reply);
      return reply.send({ success: true as const });
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
