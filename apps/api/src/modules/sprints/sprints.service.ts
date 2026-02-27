import { eq, and, sql, ne } from "drizzle-orm";
import { db } from "@arcadiux/db";
import {
  sprints,
  issues,
  workflowStatuses,
} from "@arcadiux/db/schema";
import type {
  CreateSprintInput,
  UpdateSprintInput,
} from "@arcadiux/shared/validators";

function serializeSprint(sprint: any) {
  return {
    ...sprint,
    createdAt: sprint.createdAt?.toISOString?.() ?? sprint.createdAt ?? null,
    updatedAt: sprint.updatedAt?.toISOString?.() ?? sprint.updatedAt ?? null,
  };
}

export async function createSprint(
  projectId: string,
  input: CreateSprintInput,
) {
  const [sprint] = await db
    .insert(sprints)
    .values({
      projectId,
      name: input.name,
      goal: input.goal ?? null,
      startDate: input.startDate,
      endDate: input.endDate,
      status: "planned",
    })
    .returning();

  return serializeSprint(sprint);
}

export async function listSprints(projectId: string) {
  const result = await db.query.sprints.findMany({
    where: eq(sprints.projectId, projectId),
    orderBy: (s, { desc }) => [desc(s.createdAt)],
    with: {
      issues: {
        columns: {
          id: true,
          issueNumber: true,
          title: true,
          type: true,
          statusId: true,
          priority: true,
          storyPoints: true,
          assigneeId: true,
        },
      },
    },
  });

  return result.map(serializeSprint);
}

export async function getSprint(projectId: string, sprintId: string) {
  const sprint = await db.query.sprints.findFirst({
    where: and(eq(sprints.id, sprintId), eq(sprints.projectId, projectId)),
    with: {
      issues: {
        with: {
          status: true,
          assignee: {
            columns: { id: true, email: true, fullName: true, avatarUrl: true },
          },
        },
      },
    },
  });

  if (!sprint) {
    throw Object.assign(new Error("Sprint not found"), { statusCode: 404 });
  }

  return serializeSprint(sprint);
}

export async function updateSprint(
  projectId: string,
  sprintId: string,
  input: UpdateSprintInput,
) {
  const existing = await db.query.sprints.findFirst({
    where: and(eq(sprints.id, sprintId), eq(sprints.projectId, projectId)),
  });

  if (!existing) {
    throw Object.assign(new Error("Sprint not found"), { statusCode: 404 });
  }

  if (existing.status === "completed") {
    throw Object.assign(
      new Error("Cannot update a completed sprint"),
      { statusCode: 400 },
    );
  }

  const [updated] = await db
    .update(sprints)
    .set({
      name: input.name ?? existing.name,
      goal: input.goal !== undefined ? (input.goal ?? null) : existing.goal,
      startDate: input.startDate ?? existing.startDate,
      endDate: input.endDate ?? existing.endDate,
      updatedAt: new Date(),
    })
    .where(eq(sprints.id, sprintId))
    .returning();

  return serializeSprint(updated);
}

export async function deleteSprint(projectId: string, sprintId: string) {
  const existing = await db.query.sprints.findFirst({
    where: and(eq(sprints.id, sprintId), eq(sprints.projectId, projectId)),
  });

  if (!existing) {
    throw Object.assign(new Error("Sprint not found"), { statusCode: 404 });
  }

  if (existing.status === "active") {
    throw Object.assign(
      new Error("Cannot delete an active sprint. Complete it first."),
      { statusCode: 400 },
    );
  }

  // Remove sprint reference from issues
  await db
    .update(issues)
    .set({ sprintId: null })
    .where(eq(issues.sprintId, sprintId));

  await db.delete(sprints).where(eq(sprints.id, sprintId));

  return { deleted: true };
}

export async function startSprint(projectId: string, sprintId: string) {
  const existing = await db.query.sprints.findFirst({
    where: and(eq(sprints.id, sprintId), eq(sprints.projectId, projectId)),
  });

  if (!existing) {
    throw Object.assign(new Error("Sprint not found"), { statusCode: 404 });
  }

  if (existing.status !== "planned") {
    throw Object.assign(
      new Error("Only planned sprints can be started"),
      { statusCode: 400 },
    );
  }

  // Enforce only 1 active sprint per project
  const activeSprint = await db.query.sprints.findFirst({
    where: and(
      eq(sprints.projectId, projectId),
      eq(sprints.status, "active"),
    ),
  });

  if (activeSprint) {
    throw Object.assign(
      new Error(
        `There is already an active sprint: "${activeSprint.name}". Complete it before starting a new one.`,
      ),
      { statusCode: 400 },
    );
  }

  const [updated] = await db
    .update(sprints)
    .set({
      status: "active",
      startDate: new Date().toISOString().split("T")[0],
      updatedAt: new Date(),
    })
    .where(eq(sprints.id, sprintId))
    .returning();

  return serializeSprint(updated);
}

export async function completeSprint(
  projectId: string,
  sprintId: string,
  moveToSprintId?: string,
) {
  const existing = await db.query.sprints.findFirst({
    where: and(eq(sprints.id, sprintId), eq(sprints.projectId, projectId)),
  });

  if (!existing) {
    throw Object.assign(new Error("Sprint not found"), { statusCode: 404 });
  }

  if (existing.status !== "active") {
    throw Object.assign(
      new Error("Only active sprints can be completed"),
      { statusCode: 400 },
    );
  }

  // Find incomplete issues (status category != 'done')
  const doneStatuses = await db.query.workflowStatuses.findMany({
    where: and(
      eq(workflowStatuses.projectId, projectId),
      eq(workflowStatuses.category, "done"),
    ),
  });

  const doneStatusIds = doneStatuses.map((s) => s.id);

  // Get all issues in this sprint
  const sprintIssues = await db.query.issues.findMany({
    where: eq(issues.sprintId, sprintId),
  });

  const incompleteIssues = sprintIssues.filter(
    (issue) => !issue.statusId || !doneStatusIds.includes(issue.statusId),
  );

  // Move incomplete issues to the next sprint or back to backlog
  if (incompleteIssues.length > 0) {
    const targetSprintId = moveToSprintId ?? null;

    for (const issue of incompleteIssues) {
      await db
        .update(issues)
        .set({ sprintId: targetSprintId, updatedAt: new Date() })
        .where(eq(issues.id, issue.id));
    }
  }

  // Mark sprint as completed
  const [updated] = await db
    .update(sprints)
    .set({
      status: "completed",
      endDate: new Date().toISOString().split("T")[0],
      updatedAt: new Date(),
    })
    .where(eq(sprints.id, sprintId))
    .returning();

  return {
    sprint: serializeSprint(updated),
    completedIssues: sprintIssues.length - incompleteIssues.length,
    movedIssues: incompleteIssues.length,
    movedToSprintId: moveToSprintId ?? null,
  };
}
