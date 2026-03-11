import { eq, and, sql, desc, isNull, count as drizzleCount } from "drizzle-orm";
import { db } from "@arcadiux/db";
import {
  issues,
  sprints,
  workflowStatuses,
  issueLabels,
  issueResponsibles,
  projects,
} from "@arcadiux/db/schema";
import type {
  CreateIssueInput,
  UpdateIssueInput,
  TransitionIssueInput,
} from "@arcadiux/shared/validators";
import { UUID_RE } from "@arcadiux/shared/constants";
import type { IssueListQuery } from "./issues.schemas.js";
import { eventEmitter } from "../../events/emitter.js";
import { serializeDates } from "../../utils/serialize.js";

async function enforceWipLimit(projectId: string, statusId: string) {
  // Use a transaction with row-level lock to prevent race conditions
  await db.transaction(async (tx) => {
    // Lock the status row to serialize concurrent WIP checks
    const [targetStatus] = await tx.execute(sql`
      SELECT id, name, wip_limit
      FROM workflow_statuses
      WHERE id = ${statusId}
      FOR UPDATE
    `);

    const wipLimit = Number((targetStatus as any)?.wip_limit ?? 0);
    if (!wipLimit) return;

    const [countResult] = await tx.execute(sql`
      SELECT COUNT(*) as count
      FROM issues
      WHERE project_id = ${projectId} AND status_id = ${statusId}
    `);

    const currentCount = Number((countResult as any)?.count ?? 0);

    if (currentCount >= wipLimit) {
      throw Object.assign(
        new Error(
          `WIP limit reached for status "${(targetStatus as any)?.name}" (max: ${wipLimit})`,
        ),
        { statusCode: 400 },
      );
    }
  });
}

export async function createIssue(
  projectId: string,
  input: CreateIssueInput,
  reporterId: string,
) {
  return await db.transaction(async (tx) => {
    // Get the next issue number for this project
    const maxResult = await tx
      .select({ max: sql<number>`COALESCE(MAX(${issues.issueNumber}), 0)` })
      .from(issues)
      .where(eq(issues.projectId, projectId));

    const nextNumber = Number(maxResult[0].max) + 1;

    // Get the default status (first todo status)
    const defaultStatus = await tx.query.workflowStatuses.findFirst({
      where: and(
        eq(workflowStatuses.projectId, projectId),
        eq(workflowStatuses.category, "todo"),
      ),
      orderBy: (ws, { asc }) => [asc(ws.position)],
    });

    if (!defaultStatus) {
      throw Object.assign(
        new Error("No default status found for project"),
        { statusCode: 500 },
      );
    }

    // Get max position for ordering
    const maxPosResult = await tx
      .select({ max: sql<number>`COALESCE(MAX(${issues.position}), -1)` })
      .from(issues)
      .where(eq(issues.projectId, projectId));

    const nextPosition = Number(maxPosResult[0].max) + 1;

    // Auto-copy dates from sprint if sprintId is set and dates are not provided
    let startDate = input.startDate ?? null;
    let endDate = input.endDate ?? null;

    if (input.sprintId && !input.startDate && !input.endDate) {
      const sprint = await tx.query.sprints.findFirst({
        where: eq(sprints.id, input.sprintId),
        columns: { startDate: true, endDate: true },
      });
      if (sprint) {
        startDate = sprint.startDate;
        endDate = sprint.endDate;
      }
    }

    const [issue] = await tx
      .insert(issues)
      .values({
        projectId,
        issueNumber: nextNumber,
        type: input.type,
        title: input.title,
        description: input.description ?? null,
        statusId: defaultStatus.id,
        priority: input.priority,
        assigneeId: input.assigneeId ?? null,
        reporterId,
        parentId: input.parentId ?? null,
        epicId: input.epicId ?? null,
        sprintId: input.sprintId ?? null,
        storyPoints: input.storyPoints ?? null,
        startDate,
        endDate,
        category: input.category ?? "otros",
        position: nextPosition,
      })
      .returning();

    // Handle labels
    if (input.labels && input.labels.length > 0) {
      await tx.insert(issueLabels).values(
        input.labels.map((labelId) => ({
          issueId: issue.id,
          labelId,
        })),
      );
    }

    // Handle responsibles
    if (input.responsibleIds && input.responsibleIds.length > 0) {
      await tx.insert(issueResponsibles).values(
        input.responsibleIds.map((responsibleId) => ({
          issueId: issue.id,
          responsibleId,
        })),
      );
    }

    eventEmitter.emit("issue.created", {
      issueId: issue.id,
      userId: reporterId,
      projectId,
    });

    return serializeDates(issue);
  });
}

export async function listIssues(
  projectId: string,
  query: IssueListQuery,
) {
  const conditions = [eq(issues.projectId, projectId)];

  if (query.type) {
    conditions.push(eq(issues.type, query.type));
  }
  if (query.statusId) {
    conditions.push(eq(issues.statusId, query.statusId));
  }
  if (query.priority) {
    conditions.push(eq(issues.priority, query.priority));
  }
  if (query.assigneeId) {
    conditions.push(eq(issues.assigneeId, query.assigneeId));
  }
  if (query.sprintId) {
    conditions.push(eq(issues.sprintId, query.sprintId));
  }
  if (query.epicId) {
    conditions.push(eq(issues.epicId, query.epicId));
  }
  if (query.parentId) {
    conditions.push(eq(issues.parentId, query.parentId));
  }

  const where = and(...conditions);
  const offset = (query.page - 1) * query.pageSize;

  // Run count and data queries in parallel
  const [countResult, results] = await Promise.all([
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
        issueResponsibles: {
          with: { responsible: true },
        },
      },
      orderBy: (i, { asc }) => [asc(i.position)],
      limit: query.pageSize,
      offset,
    }),
  ]);

  const totalItems = Number(countResult[0].count);
  const totalPages = Math.ceil(totalItems / query.pageSize);

  return {
    data: results.map((r) => ({
      ...serializeDates(r),
      responsibleIds: r.issueResponsibles.map((ir) => ir.responsibleId),
    })),
    pagination: {
      page: query.page,
      pageSize: query.pageSize,
      totalItems,
      totalPages,
    },
  };
}


export function resolveIssueWhere(projectId: string, identifier: string) {
  if (UUID_RE.test(identifier)) {
    return and(eq(issues.projectId, projectId), eq(issues.id, identifier));
  }
  const num = Number(identifier);
  if (Number.isNaN(num) || num <= 0) {
    throw Object.assign(new Error("Invalid issue identifier"), { statusCode: 400 });
  }
  return and(eq(issues.projectId, projectId), eq(issues.issueNumber, num));
}

export async function getByIdentifier(projectId: string, identifier: string) {
  const issue = await db.query.issues.findFirst({
    where: resolveIssueWhere(projectId, identifier),
    with: {
      status: true,
      assignee: {
        columns: { id: true, email: true, fullName: true, avatarUrl: true },
      },
      reporter: {
        columns: { id: true, email: true, fullName: true, avatarUrl: true },
      },
      parent: {
        columns: { id: true, issueNumber: true, title: true, type: true },
      },
      epic: {
        columns: { id: true, issueNumber: true, title: true, type: true },
      },
      children: {
        columns: { id: true, issueNumber: true, title: true, type: true, statusId: true },
      },
      sprint: true,
      issueLabels: {
        with: { label: true },
      },
      issueResponsibles: {
        with: { responsible: true },
      },
      comments: {
        with: {
          author: {
            columns: { id: true, email: true, fullName: true, avatarUrl: true },
          },
        },
        orderBy: (c, { desc: d }) => [d(c.createdAt)],
      },
    },
  });

  if (!issue) {
    throw Object.assign(new Error("Issue not found"), { statusCode: 404 });
  }

  return {
    ...serializeDates(issue),
    responsibleIds: issue.issueResponsibles.map((ir) => ir.responsibleId),
  };
}

export async function updateIssue(
  projectId: string,
  identifier: string,
  input: UpdateIssueInput,
  userId: string,
) {
  const existing = await db.query.issues.findFirst({
    where: resolveIssueWhere(projectId, identifier),
  });

  if (!existing) {
    throw Object.assign(new Error("Issue not found"), { statusCode: 404 });
  }

  const { labels: labelIds, responsibleIds, ...updateFields } = input;

  // Enforce WIP limit when statusId changes via PATCH (e.g. drag-and-drop)
  if (updateFields.statusId && updateFields.statusId !== existing.statusId) {
    await enforceWipLimit(projectId, updateFields.statusId);
  }

  // Auto-copy dates from sprint if sprintId changes and dates are not explicitly provided
  if (
    updateFields.sprintId &&
    updateFields.sprintId !== existing.sprintId &&
    !updateFields.startDate &&
    !updateFields.endDate
  ) {
    const sprint = await db.query.sprints.findFirst({
      where: eq(sprints.id, updateFields.sprintId),
      columns: { startDate: true, endDate: true },
    });
    if (sprint) {
      updateFields.startDate = sprint.startDate ?? undefined;
      updateFields.endDate = sprint.endDate ?? undefined;
    }
  }

  // Wrap issue update + labels in a transaction to prevent partial label loss
  const [updated] = await db.transaction(async (tx) => {
    const [result] = await tx
      .update(issues)
      .set({
        ...updateFields,
        updatedAt: new Date(),
      })
      .where(eq(issues.id, existing.id))
      .returning();

    // Update labels if provided
    if (labelIds !== undefined) {
      await tx
        .delete(issueLabels)
        .where(eq(issueLabels.issueId, existing.id));

      if (labelIds.length > 0) {
        await tx.insert(issueLabels).values(
          labelIds.map((labelId) => ({
            issueId: existing.id,
            labelId,
          })),
        );
      }
    }

    // Update responsibles if provided
    if (responsibleIds !== undefined) {
      await tx
        .delete(issueResponsibles)
        .where(eq(issueResponsibles.issueId, existing.id));

      if (responsibleIds.length > 0) {
        await tx.insert(issueResponsibles).values(
          responsibleIds.map((responsibleId) => ({
            issueId: existing.id,
            responsibleId,
          })),
        );
      }
    }

    return [result];
  });

  // Emit change events for tracked fields
  const trackedFields: Array<keyof typeof updateFields> = [
    "title",
    "description",
    "priority",
    "assigneeId",
    "sprintId",
    "storyPoints",
    "startDate",
    "endDate",
    "type",
    "category",
    "statusId",
  ];

  for (const field of trackedFields) {
    if (
      updateFields[field] !== undefined &&
      String(updateFields[field]) !== String((existing as any)[field])
    ) {
      eventEmitter.emit("issue.updated", {
        issueId: existing.id,
        userId,
        projectId,
        fieldName: field,
        oldValue: String((existing as any)[field] ?? ""),
        newValue: String(updateFields[field] ?? ""),
      });
    }
  }

  return serializeDates(updated);
}

export async function deleteIssue(projectId: string, identifier: string) {
  const existing = await db.query.issues.findFirst({
    where: resolveIssueWhere(projectId, identifier),
  });

  if (!existing) {
    throw Object.assign(new Error("Issue not found"), { statusCode: 404 });
  }

  await db.delete(issues).where(eq(issues.id, existing.id));

  return { deleted: true };
}

export async function transitionIssue(
  projectId: string,
  identifier: string,
  input: TransitionIssueInput,
  userId: string,
) {
  const existing = await db.query.issues.findFirst({
    where: resolveIssueWhere(projectId, identifier),
    with: {
      status: true,
    },
  });

  if (!existing) {
    throw Object.assign(new Error("Issue not found"), { statusCode: 404 });
  }

  // Check WIP limit on target status
  await enforceWipLimit(projectId, input.statusId);

  const [updated] = await db
    .update(issues)
    .set({
      statusId: input.statusId,
      updatedAt: new Date(),
    })
    .where(eq(issues.id, existing.id))
    .returning();

  eventEmitter.emit("issue.transitioned", {
    issueId: existing.id,
    userId,
    projectId,
    fromStatusId: existing.statusId ?? "",
    toStatusId: input.statusId,
  });

  return serializeDates(updated);
}
