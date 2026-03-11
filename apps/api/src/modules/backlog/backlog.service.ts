import { eq, and, isNull, sql } from "drizzle-orm";
import { db } from "@arcadiux/db";
import { issues } from "@arcadiux/db/schema";
import type { ReorderInput } from "@arcadiux/shared/validators";
import { serializeDates } from "../../utils/serialize.js";

export async function getBacklog(
  projectId: string,
  page: number = 1,
  pageSize: number = 50,
) {
  const where = and(
    eq(issues.projectId, projectId),
    isNull(issues.sprintId),
  );

  const offset = (page - 1) * pageSize;

  // Run count and data queries in parallel
  const [countResult, backlogIssues] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)` })
      .from(issues)
      .where(where),
    db.query.issues.findMany({
      where,
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
      limit: pageSize,
      offset,
    }),
  ]);

  const totalItems = Number(countResult[0].count);
  const totalPages = Math.ceil(totalItems / pageSize);

  return {
    data: backlogIssues.map(serializeDates),
    pagination: {
      page,
      pageSize,
      totalItems,
      totalPages,
    },
  };
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
