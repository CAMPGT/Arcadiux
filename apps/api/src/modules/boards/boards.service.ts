import { eq, and, sql, isNull } from "drizzle-orm";
import { db } from "@arcadiux/db";
import {
  issues,
  sprints,
  workflowStatuses,
} from "@arcadiux/db/schema";

export interface BoardColumn {
  status: {
    id: string;
    name: string;
    category: string;
    position: number;
    wipLimit: number | null;
  };
  issues: Array<{
    id: string;
    issueNumber: number;
    title: string;
    type: string;
    priority: string;
    storyPoints: number | null;
    position: number;
    assignee: {
      id: string;
      email: string;
      fullName: string;
      avatarUrl: string | null;
    } | null;
  }>;
  issueCount: number;
}

export async function getBoardView(
  projectId: string,
  sprintId?: string,
): Promise<BoardColumn[]> {
  // Get all workflow statuses for the project
  const statuses = await db.query.workflowStatuses.findMany({
    where: eq(workflowStatuses.projectId, projectId),
    orderBy: (ws, { asc }) => [asc(ws.position)],
  });

  // Determine which sprint to use
  let activeSprintId = sprintId;
  if (!activeSprintId) {
    const activeSprint = await db.query.sprints.findFirst({
      where: and(
        eq(sprints.projectId, projectId),
        eq(sprints.status, "active"),
      ),
    });
    activeSprintId = activeSprint?.id;
  }

  // Build the board columns
  const columns: BoardColumn[] = [];

  for (const status of statuses) {
    const conditions = [
      eq(issues.projectId, projectId),
      eq(issues.statusId, status.id),
    ];

    // If we have an active sprint, filter by it
    if (activeSprintId) {
      conditions.push(eq(issues.sprintId, activeSprintId));
    }

    const statusIssues = await db.query.issues.findMany({
      where: and(...conditions),
      with: {
        assignee: {
          columns: { id: true, email: true, fullName: true, avatarUrl: true },
        },
      },
      orderBy: (i, { asc }) => [asc(i.position)],
    });

    columns.push({
      status: {
        id: status.id,
        name: status.name,
        category: status.category,
        position: status.position,
        wipLimit: status.wipLimit,
      },
      issues: statusIssues.map((i) => ({
        id: i.id,
        issueNumber: i.issueNumber,
        title: i.title,
        type: i.type,
        priority: i.priority,
        storyPoints: i.storyPoints,
        position: i.position,
        assignee: i.assignee,
      })),
      issueCount: statusIssues.length,
    });
  }

  return columns;
}
