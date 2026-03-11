import { describe, it, expect, afterAll } from "vitest";
import { getApp, closeApp, registerUser, createProject } from "./helpers.js";

afterAll(async () => {
  await closeApp();
});

/**
 * Create a project with an active sprint containing issues.
 * Returns everything needed to exercise the report endpoints.
 */
async function setupProjectWithActiveSprint(app: any) {
  const { accessToken } = await registerUser(app);
  const { project } = await createProject(app, accessToken!);

  // Create issues in the backlog
  const issueIds: string[] = [];
  for (let i = 0; i < 3; i++) {
    const res = await app.inject({
      method: "POST",
      url: `/api/v1/projects/${project.id}/issues`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: {
        type: i === 0 ? "story" : "task",
        title: `Report Issue ${i + 1}`,
        priority: i === 0 ? "high" : "medium",
        storyPoints: (i + 1) * 2,
      },
    });
    const body = JSON.parse(res.body);
    issueIds.push(body.data.id);
  }

  // Create a sprint
  const sprintRes = await app.inject({
    method: "POST",
    url: `/api/v1/projects/${project.key}/sprints`,
    headers: { authorization: `Bearer ${accessToken}` },
    payload: {
      name: "Report Sprint",
      goal: "Test reports",
      startDate: "2026-03-01",
      endDate: "2026-03-14",
    },
  });
  const sprint = JSON.parse(sprintRes.body).data;

  // Move issues to sprint
  await app.inject({
    method: "POST",
    url: `/api/v1/projects/${project.key}/backlog/move-to-sprint`,
    headers: { authorization: `Bearer ${accessToken}` },
    payload: { issueIds, sprintId: sprint.id },
  });

  // Start the sprint
  await app.inject({
    method: "POST",
    url: `/api/v1/projects/${project.key}/sprints/${sprint.id}/start`,
    headers: { authorization: `Bearer ${accessToken}` },
  });

  return { accessToken: accessToken!, project, sprint, issueIds };
}

/**
 * Create a project with a completed sprint (for velocity reporting).
 */
async function setupProjectWithCompletedSprint(app: any) {
  const { accessToken, project, sprint, issueIds } =
    await setupProjectWithActiveSprint(app);

  // Complete the sprint
  await app.inject({
    method: "POST",
    url: `/api/v1/projects/${project.key}/sprints/${sprint.id}/complete`,
    headers: { authorization: `Bearer ${accessToken}` },
  });

  return { accessToken, project, sprint, issueIds };
}

// ─── Burndown ────────────────────────────────────────────────────────────────

describe("Reports — Burndown", () => {
  it("should return burndown data for a sprint", async () => {
    const app = await getApp();
    const { accessToken, project, sprint } =
      await setupProjectWithActiveSprint(app);

    const res = await app.inject({
      method: "GET",
      url: `/api/v1/projects/${project.key}/reports/burndown?sprintId=${sprint.id}`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    const body = JSON.parse(res.body);
    expect(res.statusCode).toBe(200);
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThan(0);

    // Each data point should have the expected shape
    const point = body.data[0];
    expect(point.date).toBeDefined();
    expect(typeof point.remainingPoints).toBe("number");
    expect(typeof point.idealPoints).toBe("number");
    expect(typeof point.completedPoints).toBe("number");
  });

  it("should return 404 for non-existent sprint burndown", async () => {
    const app = await getApp();
    const { accessToken, project } =
      await setupProjectWithActiveSprint(app);
    const fakeId = "00000000-0000-0000-0000-000000000000";

    const res = await app.inject({
      method: "GET",
      url: `/api/v1/projects/${project.key}/reports/burndown?sprintId=${fakeId}`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(res.statusCode).toBe(404);
  });

  it("should reject burndown without sprintId query param", async () => {
    const app = await getApp();
    const { accessToken, project } =
      await setupProjectWithActiveSprint(app);

    const res = await app.inject({
      method: "GET",
      url: `/api/v1/projects/${project.key}/reports/burndown`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(res.statusCode).toBe(400);
  });

  it("should reject burndown without auth", async () => {
    const app = await getApp();
    const { project, sprint } =
      await setupProjectWithActiveSprint(app);

    const res = await app.inject({
      method: "GET",
      url: `/api/v1/projects/${project.key}/reports/burndown?sprintId=${sprint.id}`,
    });

    expect(res.statusCode).toBe(401);
  });
});

// ─── Velocity ────────────────────────────────────────────────────────────────

describe("Reports — Velocity", () => {
  it("should return velocity data for completed sprints", async () => {
    const app = await getApp();
    const { accessToken, project } =
      await setupProjectWithCompletedSprint(app);

    const res = await app.inject({
      method: "GET",
      url: `/api/v1/projects/${project.key}/reports/velocity`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    const body = JSON.parse(res.body);
    expect(res.statusCode).toBe(200);
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    // We completed one sprint, so should have at least one data point
    expect(body.data.length).toBeGreaterThanOrEqual(1);

    const point = body.data[0];
    expect(point.sprintId).toBeDefined();
    expect(point.sprintName).toBeDefined();
    expect(typeof point.committedPoints).toBe("number");
    expect(typeof point.completedPoints).toBe("number");
  });

  it("should return empty velocity for project with no completed sprints", async () => {
    const app = await getApp();
    const { accessToken } = await registerUser(app);
    const { project } = await createProject(app, accessToken!);

    const res = await app.inject({
      method: "GET",
      url: `/api/v1/projects/${project.key}/reports/velocity`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    const body = JSON.parse(res.body);
    expect(res.statusCode).toBe(200);
    expect(body.data).toEqual([]);
  });

  it("should respect the limit query param", async () => {
    const app = await getApp();
    const { accessToken, project } =
      await setupProjectWithCompletedSprint(app);

    const res = await app.inject({
      method: "GET",
      url: `/api/v1/projects/${project.key}/reports/velocity?limit=1`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    const body = JSON.parse(res.body);
    expect(res.statusCode).toBe(200);
    expect(body.data.length).toBeLessThanOrEqual(1);
  });

  it("should reject velocity without auth", async () => {
    const app = await getApp();
    const { project } = await setupProjectWithCompletedSprint(app);

    const res = await app.inject({
      method: "GET",
      url: `/api/v1/projects/${project.key}/reports/velocity`,
    });

    expect(res.statusCode).toBe(401);
  });
});

// ─── Sprint Report ───────────────────────────────────────────────────────────

describe("Reports — Sprint Report", () => {
  it("should return a sprint report with issue breakdowns", async () => {
    const app = await getApp();
    const { accessToken, project, sprint } =
      await setupProjectWithActiveSprint(app);

    const res = await app.inject({
      method: "GET",
      url: `/api/v1/projects/${project.key}/reports/sprint-report?sprintId=${sprint.id}`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    const body = JSON.parse(res.body);
    expect(res.statusCode).toBe(200);
    expect(body.success).toBe(true);

    const report = body.data;
    expect(report.sprint).toBeDefined();
    expect(report.sprint.id).toBe(sprint.id);
    expect(report.sprint.name).toBe("Report Sprint");
    expect(report.totalIssues).toBe(3);
    expect(typeof report.completedIssues).toBe("number");
    expect(typeof report.incompleteIssues).toBe("number");
    expect(typeof report.totalPoints).toBe("number");
    expect(report.totalPoints).toBeGreaterThan(0);
    expect(typeof report.completedPoints).toBe("number");
    expect(Array.isArray(report.issuesByType)).toBe(true);
    expect(Array.isArray(report.issuesByPriority)).toBe(true);
  });

  it("should include correct issue type breakdown", async () => {
    const app = await getApp();
    const { accessToken, project, sprint } =
      await setupProjectWithActiveSprint(app);

    const res = await app.inject({
      method: "GET",
      url: `/api/v1/projects/${project.key}/reports/sprint-report?sprintId=${sprint.id}`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    const body = JSON.parse(res.body);
    const report = body.data;

    // We created 1 story and 2 tasks
    const storyEntry = report.issuesByType.find((e: any) => e.type === "story");
    const taskEntry = report.issuesByType.find((e: any) => e.type === "task");
    expect(storyEntry?.count).toBe(1);
    expect(taskEntry?.count).toBe(2);
  });

  it("should return 404 for non-existent sprint report", async () => {
    const app = await getApp();
    const { accessToken, project } =
      await setupProjectWithActiveSprint(app);
    const fakeId = "00000000-0000-0000-0000-000000000000";

    const res = await app.inject({
      method: "GET",
      url: `/api/v1/projects/${project.key}/reports/sprint-report?sprintId=${fakeId}`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(res.statusCode).toBe(404);
  });

  it("should reject sprint report without sprintId", async () => {
    const app = await getApp();
    const { accessToken, project } =
      await setupProjectWithActiveSprint(app);

    const res = await app.inject({
      method: "GET",
      url: `/api/v1/projects/${project.key}/reports/sprint-report`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(res.statusCode).toBe(400);
  });

  it("should reject sprint report without auth", async () => {
    const app = await getApp();
    const { project, sprint } =
      await setupProjectWithActiveSprint(app);

    const res = await app.inject({
      method: "GET",
      url: `/api/v1/projects/${project.key}/reports/sprint-report?sprintId=${sprint.id}`,
    });

    expect(res.statusCode).toBe(401);
  });
});

// ─── Lifecycle Report ────────────────────────────────────────────────────────

describe("Reports — Lifecycle", () => {
  it("should return a lifecycle report for a sprint", async () => {
    const app = await getApp();
    const { accessToken, project, sprint } =
      await setupProjectWithActiveSprint(app);

    const res = await app.inject({
      method: "GET",
      url: `/api/v1/projects/${project.key}/reports/lifecycle?sprintId=${sprint.id}`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    const body = JSON.parse(res.body);
    expect(res.statusCode).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.sprintName).toBe("Report Sprint");
    expect(Array.isArray(body.data.statuses)).toBe(true);
    expect(Array.isArray(body.data.issues)).toBe(true);
  });

  it("should return 404 for non-existent sprint lifecycle", async () => {
    const app = await getApp();
    const { accessToken, project } =
      await setupProjectWithActiveSprint(app);
    const fakeId = "00000000-0000-0000-0000-000000000000";

    const res = await app.inject({
      method: "GET",
      url: `/api/v1/projects/${project.key}/reports/lifecycle?sprintId=${fakeId}`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(res.statusCode).toBe(404);
  });

  it("should reject lifecycle without auth", async () => {
    const app = await getApp();
    const { project, sprint } =
      await setupProjectWithActiveSprint(app);

    const res = await app.inject({
      method: "GET",
      url: `/api/v1/projects/${project.key}/reports/lifecycle?sprintId=${sprint.id}`,
    });

    expect(res.statusCode).toBe(401);
  });
});
