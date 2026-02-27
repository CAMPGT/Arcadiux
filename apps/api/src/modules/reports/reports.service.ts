import { eq, and, sql, lte, gte } from "drizzle-orm";
import { db } from "@arcadiux/db";
import {
  issues,
  sprints,
  workflowStatuses,
  activityLog,
} from "@arcadiux/db/schema";

interface BurndownDataPoint {
  date: string;
  remainingPoints: number;
  idealPoints: number;
  completedPoints: number;
}

interface VelocityDataPoint {
  sprintId: string;
  sprintName: string;
  committedPoints: number;
  completedPoints: number;
}

interface SprintReport {
  sprint: {
    id: string;
    name: string;
    goal: string | null;
    status: string;
    startDate: string | null;
    endDate: string | null;
  };
  totalIssues: number;
  completedIssues: number;
  incompleteIssues: number;
  totalPoints: number;
  completedPoints: number;
  issuesByType: Array<{ type: string; count: number }>;
  issuesByPriority: Array<{ priority: string; count: number }>;
}

export async function getBurndown(
  projectId: string,
  sprintId: string,
): Promise<BurndownDataPoint[]> {
  const sprint = await db.query.sprints.findFirst({
    where: and(eq(sprints.id, sprintId), eq(sprints.projectId, projectId)),
  });

  if (!sprint) {
    throw Object.assign(new Error("Sprint not found"), { statusCode: 404 });
  }

  // Get done status IDs
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

  const totalPoints = sprintIssues.reduce(
    (sum, issue) => sum + (issue.storyPoints ?? 0),
    0,
  );

  // Calculate date range
  const startDate = sprint.startDate
    ? new Date(sprint.startDate)
    : sprint.createdAt ?? new Date();
  const endDate = sprint.endDate
    ? new Date(sprint.endDate)
    : new Date(startDate.getTime() + 14 * 24 * 60 * 60 * 1000);

  const today = new Date();
  const effectiveEnd = today < endDate ? today : endDate;

  // Get transition logs for this sprint's issues to build daily burndown
  const issueIds = sprintIssues.map((i) => i.id);

  // Build data points day by day
  const dataPoints: BurndownDataPoint[] = [];
  const totalDays = Math.ceil(
    (endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000),
  );

  // Get all status transitions for sprint issues
  let transitions: any[] = [];
  if (issueIds.length > 0) {
    const placeholders = issueIds.map((_, i) => `$${i + 1}`).join(",");
    transitions = (
      await db.execute(
        sql`SELECT issue_id, new_value, created_at
            FROM activity_log
            WHERE field_name = 'statusId'
              AND issue_id = ANY(${issueIds})
            ORDER BY created_at ASC`,
      )
    ) as any[];
  }

  // Track which issues are "done" at each point
  for (let day = 0; day <= totalDays; day++) {
    const currentDate = new Date(
      startDate.getTime() + day * 24 * 60 * 60 * 1000,
    );

    if (currentDate > effectiveEnd && currentDate > today) {
      // Future days: just show ideal line
      const idealPoints = Math.max(
        0,
        totalPoints - (totalPoints / totalDays) * day,
      );
      dataPoints.push({
        date: currentDate.toISOString().split("T")[0],
        remainingPoints: dataPoints.length > 0
          ? dataPoints[dataPoints.length - 1].remainingPoints
          : totalPoints,
        idealPoints: Math.round(idealPoints * 10) / 10,
        completedPoints: dataPoints.length > 0
          ? dataPoints[dataPoints.length - 1].completedPoints
          : 0,
      });
      continue;
    }

    // Calculate completed points up to this date
    const doneIssueIds = new Set<string>();
    for (const t of transitions) {
      if (
        new Date(t.created_at) <= currentDate &&
        doneStatusIds.includes(t.new_value)
      ) {
        doneIssueIds.add(t.issue_id);
      }
    }

    // Also check current status for issues without transition logs
    for (const issue of sprintIssues) {
      if (
        issue.statusId &&
        doneStatusIds.includes(issue.statusId) &&
        issue.createdAt &&
        new Date(issue.createdAt) <= currentDate
      ) {
        // If there are no transitions logged, use current state
        const hasTransitions = transitions.some(
          (t: any) => t.issue_id === issue.id,
        );
        if (!hasTransitions) {
          doneIssueIds.add(issue.id);
        }
      }
    }

    const completedPoints = sprintIssues
      .filter((i) => doneIssueIds.has(i.id))
      .reduce((sum, i) => sum + (i.storyPoints ?? 0), 0);

    const idealPoints = Math.max(
      0,
      totalPoints - (totalPoints / totalDays) * day,
    );

    dataPoints.push({
      date: currentDate.toISOString().split("T")[0],
      remainingPoints: totalPoints - completedPoints,
      idealPoints: Math.round(idealPoints * 10) / 10,
      completedPoints,
    });
  }

  return dataPoints;
}

export async function getVelocity(
  projectId: string,
  limit: number = 10,
): Promise<VelocityDataPoint[]> {
  // Get completed sprints
  const completedSprints = await db.query.sprints.findMany({
    where: and(
      eq(sprints.projectId, projectId),
      eq(sprints.status, "completed"),
    ),
    orderBy: (s, { desc }) => [desc(s.endDate)],
    limit,
  });

  const doneStatuses = await db.query.workflowStatuses.findMany({
    where: and(
      eq(workflowStatuses.projectId, projectId),
      eq(workflowStatuses.category, "done"),
    ),
  });
  const doneStatusIds = doneStatuses.map((s) => s.id);

  const velocityData: VelocityDataPoint[] = [];

  for (const sprint of completedSprints) {
    const sprintIssues = await db.query.issues.findMany({
      where: eq(issues.sprintId, sprint.id),
    });

    const committedPoints = sprintIssues.reduce(
      (sum, i) => sum + (i.storyPoints ?? 0),
      0,
    );

    const completedPoints = sprintIssues
      .filter(
        (i) => i.statusId && doneStatusIds.includes(i.statusId),
      )
      .reduce((sum, i) => sum + (i.storyPoints ?? 0), 0);

    velocityData.push({
      sprintId: sprint.id,
      sprintName: sprint.name,
      committedPoints,
      completedPoints,
    });
  }

  return velocityData.reverse();
}

export async function getSprintReport(
  projectId: string,
  sprintId: string,
): Promise<SprintReport> {
  const sprint = await db.query.sprints.findFirst({
    where: and(eq(sprints.id, sprintId), eq(sprints.projectId, projectId)),
  });

  if (!sprint) {
    throw Object.assign(new Error("Sprint not found"), { statusCode: 404 });
  }

  const doneStatuses = await db.query.workflowStatuses.findMany({
    where: and(
      eq(workflowStatuses.projectId, projectId),
      eq(workflowStatuses.category, "done"),
    ),
  });
  const doneStatusIds = doneStatuses.map((s) => s.id);

  const sprintIssues = await db.query.issues.findMany({
    where: eq(issues.sprintId, sprintId),
  });

  const completedIssues = sprintIssues.filter(
    (i) => i.statusId && doneStatusIds.includes(i.statusId),
  );

  const totalPoints = sprintIssues.reduce(
    (sum, i) => sum + (i.storyPoints ?? 0),
    0,
  );

  const completedPoints = completedIssues.reduce(
    (sum, i) => sum + (i.storyPoints ?? 0),
    0,
  );

  // Group by type
  const typeMap = new Map<string, number>();
  for (const issue of sprintIssues) {
    typeMap.set(issue.type, (typeMap.get(issue.type) ?? 0) + 1);
  }

  // Group by priority
  const priorityMap = new Map<string, number>();
  for (const issue of sprintIssues) {
    priorityMap.set(
      issue.priority,
      (priorityMap.get(issue.priority) ?? 0) + 1,
    );
  }

  return {
    sprint: {
      id: sprint.id,
      name: sprint.name,
      goal: sprint.goal,
      status: sprint.status,
      startDate: sprint.startDate,
      endDate: sprint.endDate,
    },
    totalIssues: sprintIssues.length,
    completedIssues: completedIssues.length,
    incompleteIssues: sprintIssues.length - completedIssues.length,
    totalPoints,
    completedPoints,
    issuesByType: Array.from(typeMap.entries()).map(([type, count]) => ({
      type,
      count,
    })),
    issuesByPriority: Array.from(priorityMap.entries()).map(
      ([priority, count]) => ({ priority, count }),
    ),
  };
}
