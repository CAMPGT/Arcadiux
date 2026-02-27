import fp from "fastify-plugin";
import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";

export interface JwtPayload {
  sub: string;
  email: string;
  fullName: string;
  iat?: number;
  exp?: number;
}

declare module "fastify" {
  interface FastifyRequest {
    currentUser: JwtPayload;
  }
  interface FastifyInstance {
    authenticate: (
      request: FastifyRequest,
      reply: FastifyReply,
    ) => Promise<void>;
  }
}

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: JwtPayload;
    user: JwtPayload;
  }
}

async function authPluginFn(fastify: FastifyInstance) {
  fastify.decorateRequest("currentUser", null as unknown as JwtPayload);

  fastify.decorate(
    "authenticate",
    async function (request: FastifyRequest, reply: FastifyReply) {
      try {
        const decoded = await request.jwtVerify<JwtPayload>();
        request.currentUser = decoded;
      } catch (err) {
        reply.code(401).send({
          success: false,
          message: "Unauthorized: invalid or expired token",
        });
      }
    },
  );
}

export const authPlugin = fp(authPluginFn, {
  name: "auth-plugin",
  dependencies: ["@fastify/jwt"],
});
