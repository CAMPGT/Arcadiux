import { eq, and, sql, gt, gte } from "drizzle-orm";
import { db } from "@arcadiux/db";
import {
  workflowStatuses,
  workflowTransitions,
  issues,
} from "@arcadiux/db/schema";

interface CreateStatusInput {
  name: string;
  category: "todo" | "in_progress" | "done";
  position?: number;
  wipLimit?: number | null;
  isActive?: boolean;
}

interface UpdateStatusInput {
  name?: string;
  category?: "todo" | "in_progress" | "done";
  position?: number;
  wipLimit?: number | null;
  isActive?: boolean;
}

interface CreateTransitionInput {
  fromStatusId: string;
  toStatusId: string;
}

export async function listStatuses(projectId: string) {
  return await db.query.workflowStatuses.findMany({
    where: eq(workflowStatuses.projectId, projectId),
    orderBy: (ws, { asc }) => [asc(ws.position)],
  });
}

export async function createStatus(
  projectId: string,
  input: CreateStatusInput,
) {
  // Calculate position if not provided
  let position = input.position;
  if (position === undefined) {
    const maxPos = await db
      .select({ max: sql<number>`COALESCE(MAX(${workflowStatuses.position}), -1)` })
      .from(workflowStatuses)
      .where(eq(workflowStatuses.projectId, projectId));
    position = Number(maxPos[0].max) + 1;
  } else {
    // Shift existing statuses to make room
    await db
      .update(workflowStatuses)
      .set({
        position: sql`${workflowStatuses.position} + 1`,
      })
      .where(
        and(
          eq(workflowStatuses.projectId, projectId),
          gte(workflowStatuses.position, position),
        ),
      );
  }

  const [status] = await db
    .insert(workflowStatuses)
    .values({
      projectId,
      name: input.name,
      category: input.category,
      position,
      wipLimit: input.wipLimit ?? null,
      isActive: input.isActive ?? true,
    })
    .returning();

  return status;
}

export async function updateStatus(
  projectId: string,
  statusId: string,
  input: UpdateStatusInput,
) {
  const existing = await db.query.workflowStatuses.findFirst({
    where: and(
      eq(workflowStatuses.id, statusId),
      eq(workflowStatuses.projectId, projectId),
    ),
  });

  if (!existing) {
    throw Object.assign(new Error("Workflow status not found"), {
      statusCode: 404,
    });
  }

  // Handle position changes
  if (input.position !== undefined && input.position !== existing.position) {
    const oldPos = existing.position;
    const newPos = input.position;

    if (newPos > oldPos) {
      // Moving down: shift items in range (old+1..new) up by 1
      await db
        .update(workflowStatuses)
        .set({
          position: sql`${workflowStatuses.position} - 1`,
        })
        .where(
          and(
            eq(workflowStatuses.projectId, projectId),
            gt(workflowStatuses.position, oldPos),
            sql`${workflowStatuses.position} <= ${newPos}`,
          ),
        );
    } else {
      // Moving up: shift items in range (new..old-1) down by 1
      await db
        .update(workflowStatuses)
        .set({
          position: sql`${workflowStatuses.position} + 1`,
        })
        .where(
          and(
            eq(workflowStatuses.projectId, projectId),
            gte(workflowStatuses.position, newPos),
            sql`${workflowStatuses.position} < ${oldPos}`,
          ),
        );
    }
  }

  const [updated] = await db
    .update(workflowStatuses)
    .set({
      name: input.name ?? existing.name,
      category: input.category ?? existing.category,
      position: input.position ?? existing.position,
      wipLimit: input.wipLimit !== undefined ? input.wipLimit : existing.wipLimit,
      isActive: input.isActive !== undefined ? input.isActive : existing.isActive,
    })
    .where(eq(workflowStatuses.id, statusId))
    .returning();

  return updated;
}

export async function deleteStatus(projectId: string, statusId: string) {
  // Check if any issues use this status
  const issueCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(issues)
    .where(eq(issues.statusId, statusId));

  if (Number(issueCount[0].count) > 0) {
    throw Object.assign(
      new Error("Cannot delete status that is assigned to issues"),
      { statusCode: 400 },
    );
  }

  const [deleted] = await db
    .delete(workflowStatuses)
    .where(
      and(
        eq(workflowStatuses.id, statusId),
        eq(workflowStatuses.projectId, projectId),
      ),
    )
    .returning();

  if (!deleted) {
    throw Object.assign(new Error("Workflow status not found"), {
      statusCode: 404,
    });
  }

  // Re-compact positions
  const remaining = await db.query.workflowStatuses.findMany({
    where: eq(workflowStatuses.projectId, projectId),
    orderBy: (ws, { asc }) => [asc(ws.position)],
  });

  for (let i = 0; i < remaining.length; i++) {
    if (remaining[i].position !== i) {
      await db
        .update(workflowStatuses)
        .set({ position: i })
        .where(eq(workflowStatuses.id, remaining[i].id));
    }
  }

  return { deleted: true };
}

export async function listTransitions(projectId: string) {
  return await db.query.workflowTransitions.findMany({
    where: eq(workflowTransitions.projectId, projectId),
    with: {
      fromStatus: true,
      toStatus: true,
    },
  });
}

export async function createTransition(
  projectId: string,
  input: CreateTransitionInput,
) {
  // Verify both statuses exist and belong to this project
  const fromStatus = await db.query.workflowStatuses.findFirst({
    where: and(
      eq(workflowStatuses.id, input.fromStatusId),
      eq(workflowStatuses.projectId, projectId),
    ),
  });

  const toStatus = await db.query.workflowStatuses.findFirst({
    where: and(
      eq(workflowStatuses.id, input.toStatusId),
      eq(workflowStatuses.projectId, projectId),
    ),
  });

  if (!fromStatus || !toStatus) {
    throw Object.assign(
      new Error("One or both statuses not found in this project"),
      { statusCode: 404 },
    );
  }

  // Check for duplicate
  const existing = await db.query.workflowTransitions.findFirst({
    where: and(
      eq(workflowTransitions.projectId, projectId),
      eq(workflowTransitions.fromStatusId, input.fromStatusId),
      eq(workflowTransitions.toStatusId, input.toStatusId),
    ),
  });

  if (existing) {
    throw Object.assign(
      new Error("This transition already exists"),
      { statusCode: 409 },
    );
  }

  const [transition] = await db
    .insert(workflowTransitions)
    .values({
      projectId,
      fromStatusId: input.fromStatusId,
      toStatusId: input.toStatusId,
    })
    .returning();

  return transition;
}

export async function deleteTransition(
  projectId: string,
  transitionId: string,
) {
  const [deleted] = await db
    .delete(workflowTransitions)
    .where(
      and(
        eq(workflowTransitions.id, transitionId),
        eq(workflowTransitions.projectId, projectId),
      ),
    )
    .returning();

  if (!deleted) {
    throw Object.assign(new Error("Workflow transition not found"), {
      statusCode: 404,
    });
  }

  return { deleted: true };
}
