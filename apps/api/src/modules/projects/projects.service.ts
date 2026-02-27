import { eq, and, sql } from "drizzle-orm";
import { db } from "@arcadiux/db";
import {
  projects,
  projectMembers,
  workflowStatuses,
  workflowTransitions,
  users,
} from "@arcadiux/db/schema";
import type { CreateProjectInput, UpdateProjectInput } from "@arcadiux/shared/validators";
import { DEFAULT_WORKFLOW_STATUSES } from "@arcadiux/shared/constants";
import type { ProjectType } from "@arcadiux/shared/constants";
import type { AddMemberInput, UpdateMemberInput } from "./projects.schemas.js";

export async function createProject(
  input: CreateProjectInput,
  ownerId: string,
) {
  // Check if key already exists
  const existing = await db.query.projects.findFirst({
    where: eq(projects.key, input.key),
  });

  if (existing) {
    throw Object.assign(
      new Error(`Project key "${input.key}" is already taken`),
      { statusCode: 409 },
    );
  }

  return await db.transaction(async (tx) => {
    // Create the project
    const [project] = await tx
      .insert(projects)
      .values({
        name: input.name,
        key: input.key,
        description: input.description ?? null,
        projectType: input.projectType,
        ownerId,
      })
      .returning();

    // Add owner as admin member
    await tx.insert(projectMembers).values({
      projectId: project.id,
      userId: ownerId,
      role: "admin",
    });

    // Create default workflow statuses based on project type
    const statusDefs =
      DEFAULT_WORKFLOW_STATUSES[input.projectType as ProjectType];
    const createdStatuses = await tx
      .insert(workflowStatuses)
      .values(
        statusDefs.map((s) => ({
          projectId: project.id,
          name: s.name,
          category: s.category,
          position: s.position,
          wipLimit: s.wipLimit,
        })),
      )
      .returning();

    // Create default transitions (each status can transition to its neighbors)
    const transitionValues: Array<{
      projectId: string;
      fromStatusId: string;
      toStatusId: string;
    }> = [];

    for (let i = 0; i < createdStatuses.length; i++) {
      for (let j = 0; j < createdStatuses.length; j++) {
        if (i !== j) {
          transitionValues.push({
            projectId: project.id,
            fromStatusId: createdStatuses[i].id,
            toStatusId: createdStatuses[j].id,
          });
        }
      }
    }

    if (transitionValues.length > 0) {
      await tx.insert(workflowTransitions).values(transitionValues);
    }

    return {
      ...project,
      createdAt: project.createdAt?.toISOString() ?? null,
      updatedAt: project.updatedAt?.toISOString() ?? null,
    };
  });
}

export async function listProjects(userId: string) {
  const memberships = await db.query.projectMembers.findMany({
    where: eq(projectMembers.userId, userId),
    with: {
      project: {
        with: {
          owner: {
            columns: {
              id: true,
              email: true,
              fullName: true,
              avatarUrl: true,
            },
          },
        },
      },
    },
  });

  return memberships.map((m) => ({
    ...m.project,
    role: m.role,
    createdAt: m.project.createdAt?.toISOString() ?? null,
    updatedAt: m.project.updatedAt?.toISOString() ?? null,
  }));
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function getByKey(key: string) {
  const isUuid = UUID_RE.test(key);
  const project = await db.query.projects.findFirst({
    where: isUuid ? eq(projects.id, key) : eq(projects.key, key),
    with: {
      owner: {
        columns: {
          id: true,
          email: true,
          fullName: true,
          avatarUrl: true,
        },
      },
      workflowStatuses: {
        orderBy: (ws, { asc }) => [asc(ws.position)],
      },
    },
  });

  if (!project) {
    throw Object.assign(new Error("Project not found"), { statusCode: 404 });
  }

  return {
    ...project,
    createdAt: project.createdAt?.toISOString() ?? null,
    updatedAt: project.updatedAt?.toISOString() ?? null,
  };
}

export async function updateProject(
  projectId: string,
  input: UpdateProjectInput,
) {
  // If key is being changed, check for uniqueness
  if (input.key) {
    const existing = await db.query.projects.findFirst({
      where: and(
        eq(projects.key, input.key),
        sql`${projects.id} != ${projectId}`,
      ),
    });

    if (existing) {
      throw Object.assign(
        new Error(`Project key "${input.key}" is already taken`),
        { statusCode: 409 },
      );
    }
  }

  const [updated] = await db
    .update(projects)
    .set({
      ...input,
      updatedAt: new Date(),
    })
    .where(eq(projects.id, projectId))
    .returning();

  if (!updated) {
    throw Object.assign(new Error("Project not found"), { statusCode: 404 });
  }

  return {
    ...updated,
    createdAt: updated.createdAt?.toISOString() ?? null,
    updatedAt: updated.updatedAt?.toISOString() ?? null,
  };
}

export async function deleteProject(projectId: string) {
  const [deleted] = await db
    .delete(projects)
    .where(eq(projects.id, projectId))
    .returning();

  if (!deleted) {
    throw Object.assign(new Error("Project not found"), { statusCode: 404 });
  }

  return { deleted: true };
}

export async function addMember(projectId: string, input: AddMemberInput) {
  // Check user exists
  const user = await db.query.users.findFirst({
    where: eq(users.id, input.userId),
  });

  if (!user) {
    throw Object.assign(new Error("User not found"), { statusCode: 404 });
  }

  // Check if already a member
  const existing = await db.query.projectMembers.findFirst({
    where: and(
      eq(projectMembers.projectId, projectId),
      eq(projectMembers.userId, input.userId),
    ),
  });

  if (existing) {
    throw Object.assign(
      new Error("User is already a member of this project"),
      { statusCode: 409 },
    );
  }

  await db.insert(projectMembers).values({
    projectId,
    userId: input.userId,
    role: input.role,
  });

  return {
    projectId,
    userId: input.userId,
    role: input.role,
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      avatarUrl: user.avatarUrl,
    },
  };
}

export async function updateMember(
  projectId: string,
  userId: string,
  input: UpdateMemberInput,
) {
  const existing = await db.query.projectMembers.findFirst({
    where: and(
      eq(projectMembers.projectId, projectId),
      eq(projectMembers.userId, userId),
    ),
  });

  if (!existing) {
    throw Object.assign(new Error("Member not found"), { statusCode: 404 });
  }

  await db
    .update(projectMembers)
    .set({ role: input.role })
    .where(
      and(
        eq(projectMembers.projectId, projectId),
        eq(projectMembers.userId, userId),
      ),
    );

  return { projectId, userId, role: input.role };
}

export async function removeMember(projectId: string, userId: string) {
  const existing = await db.query.projectMembers.findFirst({
    where: and(
      eq(projectMembers.projectId, projectId),
      eq(projectMembers.userId, userId),
    ),
  });

  if (!existing) {
    throw Object.assign(new Error("Member not found"), { statusCode: 404 });
  }

  // Prevent removing last admin
  if (existing.role === "admin") {
    const adminCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(projectMembers)
      .where(
        and(
          eq(projectMembers.projectId, projectId),
          eq(projectMembers.role, "admin"),
        ),
      );

    if (Number(adminCount[0].count) <= 1) {
      throw Object.assign(
        new Error("Cannot remove the last admin from the project"),
        { statusCode: 400 },
      );
    }
  }

  await db
    .delete(projectMembers)
    .where(
      and(
        eq(projectMembers.projectId, projectId),
        eq(projectMembers.userId, userId),
      ),
    );

  return { removed: true };
}

export async function listMembers(projectId: string) {
  const members = await db.query.projectMembers.findMany({
    where: eq(projectMembers.projectId, projectId),
    with: {
      user: {
        columns: {
          id: true,
          email: true,
          fullName: true,
          avatarUrl: true,
        },
      },
    },
  });

  return members.map((m) => ({
    userId: m.userId,
    role: m.role,
    joinedAt: m.joinedAt?.toISOString() ?? null,
    user: m.user,
  }));
}
