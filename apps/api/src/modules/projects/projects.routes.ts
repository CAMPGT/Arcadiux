import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  createProjectSchema,
  updateProjectSchema,
  addMemberSchema,
  updateMemberSchema,
  projectParamsSchema,
  memberParamsSchema,
} from "./projects.schemas.js";
import * as projectService from "./projects.service.js";

export async function projectRoutes(app: FastifyInstance) {
  // All project routes require authentication
  app.addHook("onRequest", app.authenticate);

  // POST /projects - create a project
  app.post(
    "/",
    {
      schema: {
        body: createProjectSchema,
      },
    },
    async (request, reply) => {
      const result = await projectService.createProject(
        request.body as z.infer<typeof createProjectSchema>,
        request.currentUser.sub,
      );
      return reply.code(201).send({ success: true, data: result });
    },
  );

  // GET /projects - list user's projects
  app.get("/", async (request, reply) => {
    const result = await projectService.listProjects(request.currentUser.sub);
    return reply.send({ success: true, data: result });
  });

  // GET /projects/:projectKey
  app.get(
    "/:projectKey",
    {
      onRequest: [app.requireRole(["admin", "member", "viewer"])],
      schema: {
        params: projectParamsSchema,
      },
    },
    async (request, reply) => {
      const { projectKey } = request.params as z.infer<typeof projectParamsSchema>;
      const result = await projectService.getByKey(projectKey);
      return reply.send({ success: true, data: result });
    },
  );

  // PATCH /projects/:projectKey
  app.patch(
    "/:projectKey",
    {
      onRequest: [app.requireRole(["admin"])],
      schema: {
        params: projectParamsSchema,
        body: updateProjectSchema,
      },
    },
    async (request, reply) => {
      const result = await projectService.updateProject(
        request.projectId!,
        request.body as z.infer<typeof updateProjectSchema>,
      );
      return reply.send({ success: true, data: result });
    },
  );

  // DELETE /projects/:projectKey
  app.delete(
    "/:projectKey",
    {
      onRequest: [app.requireRole(["admin"])],
      schema: {
        params: projectParamsSchema,
      },
    },
    async (request, reply) => {
      await projectService.deleteProject(request.projectId!);
      return reply.send({ success: true, data: { deleted: true } });
    },
  );

  // GET /projects/:projectKey/members
  app.get(
    "/:projectKey/members",
    {
      onRequest: [app.requireRole(["admin", "member", "viewer"])],
      schema: {
        params: projectParamsSchema,
      },
    },
    async (request, reply) => {
      const result = await projectService.listMembers(request.projectId!);
      return reply.send({ success: true, data: result });
    },
  );

  // POST /projects/:projectKey/members
  app.post(
    "/:projectKey/members",
    {
      onRequest: [app.requireRole(["admin"])],
      schema: {
        params: projectParamsSchema,
        body: addMemberSchema,
      },
    },
    async (request, reply) => {
      const result = await projectService.addMember(
        request.projectId!,
        request.body as z.infer<typeof addMemberSchema>,
      );
      return reply.code(201).send({ success: true, data: result });
    },
  );

  // PATCH /projects/:projectKey/members/:userId
  app.patch(
    "/:projectKey/members/:userId",
    {
      onRequest: [app.requireRole(["admin"])],
      schema: {
        params: memberParamsSchema,
        body: updateMemberSchema,
      },
    },
    async (request, reply) => {
      const { userId } = request.params as z.infer<typeof memberParamsSchema>;
      const result = await projectService.updateMember(
        request.projectId!,
        userId,
        request.body as z.infer<typeof updateMemberSchema>,
      );
      return reply.send({ success: true, data: result });
    },
  );

  // DELETE /projects/:projectKey/members/:userId
  app.delete(
    "/:projectKey/members/:userId",
    {
      onRequest: [app.requireRole(["admin"])],
      schema: {
        params: memberParamsSchema,
      },
    },
    async (request, reply) => {
      const { userId } = request.params as z.infer<typeof memberParamsSchema>;
      await projectService.removeMember(request.projectId!, userId);
      return reply.send({ success: true, data: { removed: true } });
    },
  );
}
