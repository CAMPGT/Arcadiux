import { describe, it, expect, afterAll } from "vitest";
import { getApp, closeApp, registerUser, createProject } from "./helpers.js";

afterAll(async () => {
  await closeApp();
});

/** Register user, create project, and create an issue in the backlog */
async function setupProjectWithBacklogIssue(app: any) {
  const { accessToken } = await registerUser(app);
  const { project } = await createProject(app, accessToken!);

  const issueRes = await app.inject({
    method: "POST",
    url: `/api/v1/projects/${project.id}/issues`,
    headers: { authorization: `Bearer ${accessToken}` },
    payload: {
      type: "story",
      title: "Backlog Issue",
      priority: "medium",
      storyPoints: 3,
    },
  });

  const issueBody = JSON.parse(issueRes.body);
  return { accessToken: accessToken!, project, issue: issueBody.data };
}

/** Create multiple backlog issues and return them */
async function setupProjectWithMultipleIssues(app: any, count: number = 3) {
  const { accessToken } = await registerUser(app);
  const { project } = await createProject(app, accessToken!);

  const issues: any[] = [];
  for (let i = 0; i < count; i++) {
    const res = await app.inject({
      method: "POST",
      url: `/api/v1/projects/${project.id}/issues`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: {
        type: "task",
        title: `Issue ${i + 1}`,
        priority: "medium",
        storyPoints: i + 1,
      },
    });
    issues.push(JSON.parse(res.body).data);
  }

  return { accessToken: accessToken!, project, issues };
}

/** Create a project with a sprint and backlog issues */
async function setupProjectWithSprintAndIssues(app: any) {
  const { accessToken, project, issues } =
    await setupProjectWithMultipleIssues(app, 2);

  // Create a sprint
  const sprintRes = await app.inject({
    method: "POST",
    url: `/api/v1/projects/${project.key}/sprints`,
    headers: { authorization: `Bearer ${accessToken}` },
    payload: {
      name: "Sprint for Backlog",
      startDate: "2026-04-01",
      endDate: "2026-04-14",
    },
  });

  const sprint = JSON.parse(sprintRes.body).data;
  return { accessToken, project, issues, sprint };
}

// ─── Backlog listing ─────────────────────────────────────────────────────────

describe("Backlog — Listing", () => {
  it("should list backlog issues (issues without a sprint)", async () => {
    const app = await getApp();
    const { accessToken, project } = await setupProjectWithBacklogIssue(app);

    const res = await app.inject({
      method: "GET",
      url: `/api/v1/projects/${project.key}/backlog`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    const body = JSON.parse(res.body);
    expect(res.statusCode).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.length).toBeGreaterThanOrEqual(1);
    expect(body.pagination).toBeDefined();
    expect(body.pagination.page).toBe(1);
    expect(body.pagination.totalItems).toBeGreaterThanOrEqual(1);
  });

  it("should support pagination", async () => {
    const app = await getApp();
    const { accessToken, project } =
      await setupProjectWithMultipleIssues(app, 3);

    const res = await app.inject({
      method: "GET",
      url: `/api/v1/projects/${project.key}/backlog?page=1&pageSize=2`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    const body = JSON.parse(res.body);
    expect(res.statusCode).toBe(200);
    expect(body.data.length).toBeLessThanOrEqual(2);
    expect(body.pagination.pageSize).toBe(2);
    expect(body.pagination.totalPages).toBeGreaterThanOrEqual(1);
  });

  it("should return empty backlog for a new project", async () => {
    const app = await getApp();
    const { accessToken } = await registerUser(app);
    const { project } = await createProject(app, accessToken!);

    const res = await app.inject({
      method: "GET",
      url: `/api/v1/projects/${project.key}/backlog`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    const body = JSON.parse(res.body);
    expect(res.statusCode).toBe(200);
    expect(body.data).toEqual([]);
    expect(body.pagination.totalItems).toBe(0);
  });

  it("should reject backlog listing without auth", async () => {
    const app = await getApp();
    const { project } = await setupProjectWithBacklogIssue(app);

    const res = await app.inject({
      method: "GET",
      url: `/api/v1/projects/${project.key}/backlog`,
    });

    expect(res.statusCode).toBe(401);
  });
});

// ─── Reorder ─────────────────────────────────────────────────────────────────

describe("Backlog — Reorder", () => {
  it("should reorder backlog issues", async () => {
    const app = await getApp();
    const { accessToken, project, issues } =
      await setupProjectWithMultipleIssues(app, 3);

    const res = await app.inject({
      method: "PATCH",
      url: `/api/v1/projects/${project.key}/backlog/reorder`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: {
        items: [
          { id: issues[2].id, position: 0 },
          { id: issues[0].id, position: 1 },
          { id: issues[1].id, position: 2 },
        ],
      },
    });

    const body = JSON.parse(res.body);
    expect(res.statusCode).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.reordered).toBe(true);
    expect(body.data.count).toBe(3);
  });

  it("should reject reorder with empty items", async () => {
    const app = await getApp();
    const { accessToken, project } = await setupProjectWithBacklogIssue(app);

    const res = await app.inject({
      method: "PATCH",
      url: `/api/v1/projects/${project.key}/backlog/reorder`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { items: [] },
    });

    expect(res.statusCode).toBe(400);
  });

  it("should reject reorder without auth", async () => {
    const app = await getApp();
    const { project, issue } = await setupProjectWithBacklogIssue(app);

    const res = await app.inject({
      method: "PATCH",
      url: `/api/v1/projects/${project.key}/backlog/reorder`,
      payload: { items: [{ id: issue.id, position: 0 }] },
    });

    expect(res.statusCode).toBe(401);
  });
});

// ─── Move to sprint / backlog ────────────────────────────────────────────────

describe("Backlog — Move to sprint", () => {
  it("should move issues from backlog to a sprint", async () => {
    const app = await getApp();
    const { accessToken, project, issues, sprint } =
      await setupProjectWithSprintAndIssues(app);

    const res = await app.inject({
      method: "POST",
      url: `/api/v1/projects/${project.key}/backlog/move-to-sprint`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: {
        issueIds: [issues[0].id],
        sprintId: sprint.id,
      },
    });

    const body = JSON.parse(res.body);
    expect(res.statusCode).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.moved).toBe(true);
    expect(body.data.count).toBe(1);
  });

  it("should move multiple issues to a sprint at once", async () => {
    const app = await getApp();
    const { accessToken, project, issues, sprint } =
      await setupProjectWithSprintAndIssues(app);

    const res = await app.inject({
      method: "POST",
      url: `/api/v1/projects/${project.key}/backlog/move-to-sprint`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: {
        issueIds: issues.map((i: any) => i.id),
        sprintId: sprint.id,
      },
    });

    const body = JSON.parse(res.body);
    expect(res.statusCode).toBe(200);
    expect(body.data.count).toBe(2);

    // Verify backlog is now empty
    const backlogRes = await app.inject({
      method: "GET",
      url: `/api/v1/projects/${project.key}/backlog`,
      headers: { authorization: `Bearer ${accessToken}` },
    });
    const backlogBody = JSON.parse(backlogRes.body);
    expect(backlogBody.pagination.totalItems).toBe(0);
  });

  it("should reject move-to-sprint with empty issueIds", async () => {
    const app = await getApp();
    const { accessToken, project, sprint } =
      await setupProjectWithSprintAndIssues(app);

    const res = await app.inject({
      method: "POST",
      url: `/api/v1/projects/${project.key}/backlog/move-to-sprint`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: {
        issueIds: [],
        sprintId: sprint.id,
      },
    });

    expect(res.statusCode).toBe(400);
  });

  it("should reject move-to-sprint without auth", async () => {
    const app = await getApp();
    const { project, issues, sprint } =
      await setupProjectWithSprintAndIssues(app);

    const res = await app.inject({
      method: "POST",
      url: `/api/v1/projects/${project.key}/backlog/move-to-sprint`,
      payload: {
        issueIds: [issues[0].id],
        sprintId: sprint.id,
      },
    });

    expect(res.statusCode).toBe(401);
  });
});

describe("Backlog — Move to backlog", () => {
  it("should move issues from sprint back to backlog", async () => {
    const app = await getApp();
    const { accessToken, project, issues, sprint } =
      await setupProjectWithSprintAndIssues(app);

    // First move issue to sprint
    await app.inject({
      method: "POST",
      url: `/api/v1/projects/${project.key}/backlog/move-to-sprint`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: {
        issueIds: [issues[0].id],
        sprintId: sprint.id,
      },
    });

    // Now move it back to backlog
    const res = await app.inject({
      method: "POST",
      url: `/api/v1/projects/${project.key}/backlog/move-to-backlog`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: {
        issueIds: [issues[0].id],
      },
    });

    const body = JSON.parse(res.body);
    expect(res.statusCode).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.moved).toBe(true);
    expect(body.data.count).toBe(1);
  });

  it("should reject move-to-backlog with empty issueIds", async () => {
    const app = await getApp();
    const { accessToken, project } = await setupProjectWithBacklogIssue(app);

    const res = await app.inject({
      method: "POST",
      url: `/api/v1/projects/${project.key}/backlog/move-to-backlog`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { issueIds: [] },
    });

    expect(res.statusCode).toBe(400);
  });
});
