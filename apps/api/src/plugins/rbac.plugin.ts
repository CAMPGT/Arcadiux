import fp from "fastify-plugin";
import type {
  FastifyInstance,
  FastifyRequest,
  FastifyReply,
  preHandlerHookHandler,
} from "fastify";
import { eq, and } from "drizzle-orm";
import { db } from "@arcadiux/db";
import { projects, projectMembers } from "@arcadiux/db/schema";
import type { ProjectRole } from "@arcadiux/shared/constants";

declare module "fastify" {
  interface FastifyInstance {
    requireRole: (
      roles: ProjectRole[],
    ) => preHandlerHookHandler;
  }
  interface FastifyRequest {
    projectId: string | null;
    memberRole: ProjectRole | null;
  }
}

async function rbacPluginFn(fastify: FastifyInstance) {
  fastify.decorateRequest("projectId", null);
  fastify.decorateRequest("memberRole", null);

  fastify.decorate(
    "requireRole",
    function (roles: ProjectRole[]): preHandlerHookHandler {
      return async function (
        request: FastifyRequest,
        reply: FastifyReply,
      ) {
        const projectKey = (request.params as { projectKey?: string })
          .projectKey;

        if (!projectKey) {
          return reply.code(400).send({
            success: false,
            message: "Project key is required",
          });
        }

        // Resolve project by key or UUID
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(projectKey);
        const project = await db.query.projects.findFirst({
          where: isUuid
            ? eq(projects.id, projectKey)
            : eq(projects.key, projectKey),
        });

        if (!project) {
          return reply.code(404).send({
            success: false,
            message: "Project not found",
          });
        }

        request.projectId = project.id;

        // Fetch membership
        const membership = await db.query.projectMembers.findFirst({
          where: and(
            eq(projectMembers.projectId, project.id),
            eq(projectMembers.userId, request.currentUser.sub),
          ),
        });

        if (!membership) {
          return reply.code(403).send({
            success: false,
            message: "You are not a member of this project",
          });
        }

        request.memberRole = membership.role;

        if (!roles.includes(membership.role as ProjectRole)) {
          return reply.code(403).send({
            success: false,
            message: `Insufficient permissions. Required roles: ${roles.join(", ")}`,
          });
        }
      };
    },
  );
}

export const rbacPlugin = fp(rbacPluginFn, {
  name: "rbac-plugin",
  dependencies: ["auth-plugin"],
});
