import fp from "fastify-plugin";
import type { FastifyInstance, FastifyError } from "fastify";
import { ZodError } from "zod";

async function errorHandlerPluginFn(fastify: FastifyInstance) {
  fastify.setErrorHandler((error: FastifyError | Error, request, reply) => {
    // Zod validation errors
    if (error instanceof ZodError) {
      return reply.code(400).send({
        success: false,
        message: "Validation error",
        errors: error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
          code: issue.code,
        })),
      });
    }

    // Fastify validation errors (from schema validation)
    const fastifyError = error as FastifyError;
    if (fastifyError.validation) {
      return reply.code(400).send({
        success: false,
        message: "Validation error",
        errors: fastifyError.validation.map((v) => ({
          path: v.instancePath || v.schemaPath,
          message: v.message ?? "Invalid value",
        })),
      });
    }

    // JWT errors
    if (
      fastifyError.code === "FST_JWT_NO_AUTHORIZATION_IN_HEADER" ||
      fastifyError.code === "FST_JWT_AUTHORIZATION_TOKEN_EXPIRED" ||
      fastifyError.code === "FST_JWT_AUTHORIZATION_TOKEN_INVALID" ||
      fastifyError.code === "FST_JWT_BAD_REQUEST" ||
      fastifyError.statusCode === 401
    ) {
      return reply.code(401).send({
        success: false,
        message: "Unauthorized: " + (error.message || "invalid token"),
      });
    }

    // Not found
    if (fastifyError.statusCode === 404) {
      return reply.code(404).send({
        success: false,
        message: error.message || "Resource not found",
      });
    }

    // Rate limit exceeded
    if (fastifyError.statusCode === 429) {
      return reply.code(429).send({
        success: false,
        message: "Too many requests, please slow down",
      });
    }

    // Generic server error
    request.log.error(error, "Unhandled error");
    return reply.code(fastifyError.statusCode || 500).send({
      success: false,
      message:
        process.env.NODE_ENV === "production"
          ? "Internal server error"
          : error.message,
    });
  });

  // Handle 404 routes
  fastify.setNotFoundHandler((request, reply) => {
    reply.code(404).send({
      success: false,
      message: `Route ${request.method} ${request.url} not found`,
    });
  });
}

export const errorHandlerPlugin = fp(errorHandlerPluginFn, {
  name: "error-handler-plugin",
});
