import { eq, and, sql, lte, gte, inArray, asc } from "drizzle-orm";
import { db } from "@arcadiux/db";
import {
  issues,
  sprints,
  projects,
  workflowStatuses,
  activityLog,
} from "@arcadiux/db/schema";
import type {
  StatusDuration,
  IssueLifecycle,
  LifecycleReport,
  LifecycleStatus,
} from "@arcadiux/shared/types";

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

  // Get done statuses and sprint issues in parallel
  const [doneStatuses, sprintIssues] = await Promise.all([
    db.query.workflowStatuses.findMany({
      where: and(
        eq(workflowStatuses.projectId, projectId),
        eq(workflowStatuses.category, "done"),
      ),
    }),
    db.query.issues.findMany({
      where: eq(issues.sprintId, sprintId),
    }),
  ]);
  const doneStatusIdSet = new Set(doneStatuses.map((s) => s.id));

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
        doneStatusIdSet.has(t.new_value)
      ) {
        doneIssueIds.add(t.issue_id);
      }
    }

    // Also check current status for issues without transition logs
    for (const issue of sprintIssues) {
      if (
        issue.statusId &&
        doneStatusIdSet.has(issue.statusId) &&
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
  // Single query: sprints + their issues (eliminates N+1)
  const completedSprints = await db.query.sprints.findMany({
    where: and(
      eq(sprints.projectId, projectId),
      eq(sprints.status, "completed"),
    ),
    orderBy: (s, { desc }) => [desc(s.endDate)],
    limit,
    with: {
      issues: {
        columns: { id: true, storyPoints: true, statusId: true },
      },
    },
  });

  const doneStatuses = await db.query.workflowStatuses.findMany({
    where: and(
      eq(workflowStatuses.projectId, projectId),
      eq(workflowStatuses.category, "done"),
    ),
  });
  const doneStatusIds = new Set(doneStatuses.map((s) => s.id));

  const velocityData: VelocityDataPoint[] = completedSprints.map((sprint) => {
    const committedPoints = sprint.issues.reduce(
      (sum, i) => sum + (i.storyPoints ?? 0),
      0,
    );
    const completedPoints = sprint.issues
      .filter((i) => i.statusId && doneStatusIds.has(i.statusId))
      .reduce((sum, i) => sum + (i.storyPoints ?? 0), 0);

    return {
      sprintId: sprint.id,
      sprintName: sprint.name,
      committedPoints,
      completedPoints,
    };
  });

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

  const [doneStatuses2, sprintIssues] = await Promise.all([
    db.query.workflowStatuses.findMany({
      where: and(
        eq(workflowStatuses.projectId, projectId),
        eq(workflowStatuses.category, "done"),
      ),
    }),
    db.query.issues.findMany({
      where: eq(issues.sprintId, sprintId),
    }),
  ]);
  const doneStatusIdSet2 = new Set(doneStatuses2.map((s) => s.id));

  const completedIssues = sprintIssues.filter(
    (i) => i.statusId && doneStatusIdSet2.has(i.statusId),
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

// ─── Lifecycle Report ────────────────────────────────────────────────────────

function formatDuration(ms: number): string {
  if (ms < 0) ms = 0;
  const minutes = Math.floor(ms / 60_000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days >= 1) {
    const remHours = hours % 24;
    return remHours > 0 ? `${days}d ${remHours}h` : `${days}d`;
  }
  if (hours >= 1) {
    const remMinutes = minutes % 60;
    return remMinutes > 0 ? `${hours}h ${remMinutes}m` : `${hours}h`;
  }
  return `${minutes}m`;
}

export async function getLifecycleReport(
  projectId: string,
  sprintId: string,
): Promise<LifecycleReport> {
  // 1. Validate sprint
  const sprint = await db.query.sprints.findFirst({
    where: and(eq(sprints.id, sprintId), eq(sprints.projectId, projectId)),
  });
  if (!sprint) {
    throw Object.assign(new Error("Sprint not found"), { statusCode: 404 });
  }

  // 2. Get project key + workflow statuses in parallel
  const [project, allStatuses] = await Promise.all([
    db.query.projects.findFirst({
      where: eq(projects.id, projectId),
      columns: { key: true },
    }),
    db.query.workflowStatuses.findMany({
      where: eq(workflowStatuses.projectId, projectId),
    }),
  ]);
  const projectKey = project?.key ?? "";
  const statusMap = new Map(allStatuses.map((s) => [s.id, s]));

  // Build sorted status list for response
  const sortedStatuses = [...allStatuses]
    .filter((s) => s.isActive)
    .sort((a, b) => a.position - b.position);
  const lifecycleStatuses: LifecycleStatus[] = sortedStatuses.map((s) => ({
    statusId: s.id,
    statusName: s.name,
    category: s.category,
    position: s.position,
  }));

  // 4. Get all issues in this sprint
  const sprintIssues = await db.query.issues.findMany({
    where: eq(issues.sprintId, sprintId),
  });

  if (sprintIssues.length === 0) {
    return { sprintName: sprint.name, statuses: lifecycleStatuses, issues: [] };
  }

  const issueIds = sprintIssues.map((i) => i.id);

  // 5. Get all status transitions (both 'transitioned' and 'updated' with statusId)
  const transitions = await db
    .select({
      issue_id: activityLog.issueId,
      old_value: activityLog.oldValue,
      new_value: activityLog.newValue,
      created_at: activityLog.createdAt,
    })
    .from(activityLog)
    .where(
      and(
        inArray(activityLog.issueId, issueIds),
        eq(activityLog.fieldName, "statusId"),
        inArray(activityLog.action, ["transitioned", "updated"]),
      ),
    )
    .orderBy(asc(activityLog.issueId), asc(activityLog.createdAt));

  // 6. Get creation timestamps
  const creationLogs = await db
    .select({
      issue_id: activityLog.issueId,
      created_at: activityLog.createdAt,
    })
    .from(activityLog)
    .where(
      and(
        inArray(activityLog.issueId, issueIds),
        eq(activityLog.action, "created"),
      ),
    );
  const creationMap = new Map(creationLogs.map((c) => [c.issue_id, c.created_at]));

  // Group transitions by issue
  const transitionsByIssue = new Map<string, typeof transitions>();
  for (const t of transitions) {
    let arr = transitionsByIssue.get(t.issue_id);
    if (!arr) {
      arr = [];
      transitionsByIssue.set(t.issue_id, arr);
    }
    arr.push(t);
  }

  const now = Date.now();

  // Helper to safely get timestamp from Date | null
  const toMs = (d: Date | null | undefined): number =>
    d ? d.getTime() : Date.now();

  // 7. Build lifecycle for each issue
  const issueLifecycles: IssueLifecycle[] = sprintIssues.map((issue): IssueLifecycle | null => {
    const creationLog = creationMap.get(issue.id);
    const createdAt = toMs(creationLog ?? issue.createdAt);

    const issueTrans = transitionsByIssue.get(issue.id) ?? [];
    const accumulated = new Map<string, number>(); // statusId -> ms

    if (issueTrans.length === 0) {
      // No transitions: single segment from creation to now in current status
      if (!issue.statusId) return null;
      const duration = now - createdAt;
      accumulated.set(issue.statusId, duration);
    } else {
      // Initial segment: from creation to first transition, in the old_value of first transition
      const firstOld = issueTrans[0].old_value;
      const firstTime = toMs(issueTrans[0].created_at);
      if (firstOld) {
        accumulated.set(firstOld, (accumulated.get(firstOld) ?? 0) + (firstTime - createdAt));
      }

      // For each transition, the new_value is active until the next transition (or now)
      for (let i = 0; i < issueTrans.length; i++) {
        const statusId = issueTrans[i].new_value;
        const start = toMs(issueTrans[i].created_at);
        const end = i + 1 < issueTrans.length
          ? toMs(issueTrans[i + 1].created_at)
          : now;
        if (statusId) {
          accumulated.set(statusId, (accumulated.get(statusId) ?? 0) + (end - start));
        }
      }
    }

    // Build durations sorted by workflow position
    const durations: StatusDuration[] = [];
    for (const [statusId, totalMs] of accumulated) {
      const status = statusMap.get(statusId);
      durations.push({
        statusId,
        statusName: status?.name ?? "Desconocido",
        category: status?.category ?? "todo",
        totalMs,
        formatted: formatDuration(totalMs),
      });
    }
    durations.sort((a, b) => {
      const posA = statusMap.get(a.statusId)?.position ?? 999;
      const posB = statusMap.get(b.statusId)?.position ?? 999;
      return posA - posB;
    });

    const totalMs = durations.reduce((sum, d) => sum + d.totalMs, 0);
    const currentStatus = (issue.statusId && statusMap.get(issue.statusId)?.name) ?? "Desconocido";

    return {
      issueId: issue.id,
      issueKey: `${projectKey}-${issue.issueNumber}`,
      title: issue.title,
      type: issue.type,
      currentStatus,
      durations,
      totalMs,
      totalFormatted: formatDuration(totalMs),
    };
  }).filter((x): x is IssueLifecycle => x !== null);

  return {
    sprintName: sprint.name,
    statuses: lifecycleStatuses,
    issues: issueLifecycles,
  };
}
