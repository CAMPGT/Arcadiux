import { eq, and, isNull, sql } from "drizzle-orm";
import { db } from "@arcadiux/db";
import { issues } from "@arcadiux/db/schema";
import type { ReorderInput } from "@arcadiux/shared/validators";

export async function getBacklog(projectId: string) {
  const backlogIssues = await db.query.issues.findMany({
    where: and(
      eq(issues.projectId, projectId),
      isNull(issues.sprintId),
    ),
    with: {
      status: true,
      assignee: {
        columns: { id: true, email: true, fullName: true, avatarUrl: true },
      },
      reporter: {
        columns: { id: true, email: true, fullName: true, avatarUrl: true },
      },
      issueLabels: {
        with: { label: true },
      },
      epic: {
        columns: { id: true, issueNumber: true, title: true },
      },
    },
    orderBy: (i, { asc }) => [asc(i.position)],
  });

  return backlogIssues.map((issue) => ({
    ...issue,
    createdAt: issue.createdAt?.toISOString() ?? null,
    updatedAt: issue.updatedAt?.toISOString() ?? null,
  }));
}

export async function reorderBacklog(
  projectId: string,
  input: ReorderInput,
) {
  await db.transaction(async (tx) => {
    for (const item of input.items) {
      await tx
        .update(issues)
        .set({
          position: item.position,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(issues.id, item.id),
            eq(issues.projectId, projectId),
          ),
        );
    }
  });

  return { reordered: true, count: input.items.length };
}

export async function moveToSprint(
  projectId: string,
  issueIds: string[],
  sprintId: string,
) {
  await db.transaction(async (tx) => {
    for (const issueId of issueIds) {
      await tx
        .update(issues)
        .set({
          sprintId,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(issues.id, issueId),
            eq(issues.projectId, projectId),
          ),
        );
    }
  });

  return { moved: true, count: issueIds.length };
}

export async function moveToBacklog(
  projectId: string,
  issueIds: string[],
) {
  await db.transaction(async (tx) => {
    for (const issueId of issueIds) {
      await tx
        .update(issues)
        .set({
          sprintId: null,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(issues.id, issueId),
            eq(issues.projectId, projectId),
          ),
        );
    }
  });

  return { moved: true, count: issueIds.length };
}
