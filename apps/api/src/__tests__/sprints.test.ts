import { describe, it, expect, afterAll } from "vitest";
import { getApp, closeApp, registerUser, createProject } from "./helpers.js";

afterAll(async () => {
  await closeApp();
});

/** Create a project and return its key + access token */
async function setupProject(app: any) {
  const { accessToken } = await registerUser(app);
  const { project } = await createProject(app, accessToken!);
  return { accessToken: accessToken!, project };
}

/** Create a sprint inside a project and return all context */
async function setupProjectWithSprint(app: any) {
  const { accessToken, project } = await setupProject(app);

  const res = await app.inject({
    method: "POST",
    url: `/api/v1/projects/${project.key}/sprints`,
    headers: { authorization: `Bearer ${accessToken}` },
    payload: {
      name: "Sprint 1",
      goal: "Deliver MVP",
      startDate: "2026-04-01",
      endDate: "2026-04-14",
    },
  });

  const body = JSON.parse(res.body);
  return {
    accessToken,
    project,
    sprint: body.data,
    sprintStatusCode: res.statusCode,
  };
}

// ─── CRUD ────────────────────────────────────────────────────────────────────

describe("Sprints — CRUD", () => {
  it("should create a sprint", async () => {
    const app = await getApp();
    const { sprintStatusCode, sprint } = await setupProjectWithSprint(app);

    expect(sprintStatusCode).toBe(201);
    expect(sprint.name).toBe("Sprint 1");
    expect(sprint.goal).toBe("Deliver MVP");
    expect(sprint.status).toBe("planned");
    expect(sprint.startDate).toBe("2026-04-01");
    expect(sprint.endDate).toBe("2026-04-14");
  });

  it("should list sprints for a project", async () => {
    const app = await getApp();
    const { accessToken, project } = await setupProjectWithSprint(app);

    const res = await app.inject({
      method: "GET",
      url: `/api/v1/projects/${project.key}/sprints`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    const body = JSON.parse(res.body);
    expect(res.statusCode).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.length).toBeGreaterThanOrEqual(1);
  });

  it("should get a single sprint by ID", async () => {
    const app = await getApp();
    const { accessToken, project, sprint } = await setupProjectWithSprint(app);

    const res = await app.inject({
      method: "GET",
      url: `/api/v1/projects/${project.key}/sprints/${sprint.id}`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    const body = JSON.parse(res.body);
    expect(res.statusCode).toBe(200);
    expect(body.data.id).toBe(sprint.id);
    expect(body.data.name).toBe("Sprint 1");
  });

  it("should update a sprint", async () => {
    const app = await getApp();
    const { accessToken, project, sprint } = await setupProjectWithSprint(app);

    const res = await app.inject({
      method: "PATCH",
      url: `/api/v1/projects/${project.key}/sprints/${sprint.id}`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { name: "Sprint 1 — Renamed", goal: "Updated goal" },
    });

    const body = JSON.parse(res.body);
    expect(res.statusCode).toBe(200);
    expect(body.data.name).toBe("Sprint 1 — Renamed");
    expect(body.data.goal).toBe("Updated goal");
  });

  it("should delete a planned sprint", async () => {
    const app = await getApp();
    const { accessToken, project, sprint } = await setupProjectWithSprint(app);

    const res = await app.inject({
      method: "DELETE",
      url: `/api/v1/projects/${project.key}/sprints/${sprint.id}`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(res.statusCode).toBe(200);

    // Verify it's gone
    const getRes = await app.inject({
      method: "GET",
      url: `/api/v1/projects/${project.key}/sprints/${sprint.id}`,
      headers: { authorization: `Bearer ${accessToken}` },
    });
    expect(getRes.statusCode).toBe(404);
  });

  it("should reject creating a sprint without auth", async () => {
    const app = await getApp();
    const { project } = await setupProject(app);

    const res = await app.inject({
      method: "POST",
      url: `/api/v1/projects/${project.key}/sprints`,
      payload: {
        name: "No Auth Sprint",
        startDate: "2026-05-01",
        endDate: "2026-05-14",
      },
    });

    expect(res.statusCode).toBe(401);
  });

  it("should reject creating a sprint with invalid dates", async () => {
    const app = await getApp();
    const { accessToken, project } = await setupProject(app);

    const res = await app.inject({
      method: "POST",
      url: `/api/v1/projects/${project.key}/sprints`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: {
        name: "Bad Dates Sprint",
        startDate: "not-a-date",
        endDate: "2026-05-14",
      },
    });

    expect(res.statusCode).toBe(400);
  });

  it("should reject creating a sprint with empty name", async () => {
    const app = await getApp();
    const { accessToken, project } = await setupProject(app);

    const res = await app.inject({
      method: "POST",
      url: `/api/v1/projects/${project.key}/sprints`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: {
        name: "",
        startDate: "2026-05-01",
        endDate: "2026-05-14",
      },
    });

    expect(res.statusCode).toBe(400);
  });
});

// ─── Start / Complete ────────────────────────────────────────────────────────

describe("Sprints — Start & Complete", () => {
  it("should start a planned sprint", async () => {
    const app = await getApp();
    const { accessToken, project, sprint } = await setupProjectWithSprint(app);

    const res = await app.inject({
      method: "POST",
      url: `/api/v1/projects/${project.key}/sprints/${sprint.id}/start`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    const body = JSON.parse(res.body);
    expect(res.statusCode).toBe(200);
    expect(body.data.status).toBe("active");
  });

  it("should reject starting an already active sprint", async () => {
    const app = await getApp();
    const { accessToken, project, sprint } = await setupProjectWithSprint(app);

    // Start the sprint first
    await app.inject({
      method: "POST",
      url: `/api/v1/projects/${project.key}/sprints/${sprint.id}/start`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    // Try to start it again
    const res = await app.inject({
      method: "POST",
      url: `/api/v1/projects/${project.key}/sprints/${sprint.id}/start`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(res.statusCode).toBe(400);
  });

  it("should enforce only one active sprint per project", async () => {
    const app = await getApp();
    const { accessToken, project, sprint } = await setupProjectWithSprint(app);

    // Start first sprint
    await app.inject({
      method: "POST",
      url: `/api/v1/projects/${project.key}/sprints/${sprint.id}/start`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    // Create a second sprint
    const res2 = await app.inject({
      method: "POST",
      url: `/api/v1/projects/${project.key}/sprints`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: {
        name: "Sprint 2",
        startDate: "2026-04-15",
        endDate: "2026-04-28",
      },
    });
    const sprint2 = JSON.parse(res2.body).data;

    // Try to start second sprint (should fail)
    const startRes = await app.inject({
      method: "POST",
      url: `/api/v1/projects/${project.key}/sprints/${sprint2.id}/start`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(startRes.statusCode).toBe(400);
    const startBody = JSON.parse(startRes.body);
    expect(startBody.message).toContain("already an active sprint");
  });

  it("should complete an active sprint", async () => {
    const app = await getApp();
    const { accessToken, project, sprint } = await setupProjectWithSprint(app);

    // Start the sprint
    await app.inject({
      method: "POST",
      url: `/api/v1/projects/${project.key}/sprints/${sprint.id}/start`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    // Complete the sprint
    const res = await app.inject({
      method: "POST",
      url: `/api/v1/projects/${project.key}/sprints/${sprint.id}/complete`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    const body = JSON.parse(res.body);
    expect(res.statusCode).toBe(200);
    expect(body.data.sprint.status).toBe("completed");
    expect(body.data.completedIssues).toBeDefined();
    expect(body.data.movedIssues).toBeDefined();
  });

  it("should reject completing a planned sprint", async () => {
    const app = await getApp();
    const { accessToken, project, sprint } = await setupProjectWithSprint(app);

    const res = await app.inject({
      method: "POST",
      url: `/api/v1/projects/${project.key}/sprints/${sprint.id}/complete`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(res.statusCode).toBe(400);
  });

  it("should reject updating a completed sprint", async () => {
    const app = await getApp();
    const { accessToken, project, sprint } = await setupProjectWithSprint(app);

    // Start then complete
    await app.inject({
      method: "POST",
      url: `/api/v1/projects/${project.key}/sprints/${sprint.id}/start`,
      headers: { authorization: `Bearer ${accessToken}` },
    });
    await app.inject({
      method: "POST",
      url: `/api/v1/projects/${project.key}/sprints/${sprint.id}/complete`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    // Try to update
    const res = await app.inject({
      method: "PATCH",
      url: `/api/v1/projects/${project.key}/sprints/${sprint.id}`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { name: "Should Fail" },
    });

    expect(res.statusCode).toBe(400);
  });

  it("should reject deleting an active sprint", async () => {
    const app = await getApp();
    const { accessToken, project, sprint } = await setupProjectWithSprint(app);

    // Start the sprint
    await app.inject({
      method: "POST",
      url: `/api/v1/projects/${project.key}/sprints/${sprint.id}/start`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    // Try to delete
    const res = await app.inject({
      method: "DELETE",
      url: `/api/v1/projects/${project.key}/sprints/${sprint.id}`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(res.statusCode).toBe(400);
  });

  it("should return 404 for non-existent sprint", async () => {
    const app = await getApp();
    const { accessToken, project } = await setupProject(app);
    const fakeId = "00000000-0000-0000-0000-000000000000";

    const res = await app.inject({
      method: "GET",
      url: `/api/v1/projects/${project.key}/sprints/${fakeId}`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(res.statusCode).toBe(404);
  });
});
