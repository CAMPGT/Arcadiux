import { describe, it, expect, afterAll } from "vitest";
import { getApp, closeApp, registerUser, createProject } from "./helpers.js";

afterAll(async () => {
  await closeApp();
});

async function setupProjectWithIssue(app: any) {
  const { accessToken } = await registerUser(app);
  const { project } = await createProject(app, accessToken!);

  const issueRes = await app.inject({
    method: "POST",
    url: `/api/v1/projects/${project.id}/issues`,
    headers: { authorization: `Bearer ${accessToken}` },
    payload: {
      type: "story",
      title: "Test Issue",
      priority: "medium",
    },
  });

  const issueBody = JSON.parse(issueRes.body);
  return { accessToken: accessToken!, project, issue: issueBody.data, issueStatusCode: issueRes.statusCode };
}

describe("Issues — CRUD", () => {
  it("should create an issue", async () => {
    const app = await getApp();
    const { issueStatusCode, issue } = await setupProjectWithIssue(app);

    expect(issueStatusCode).toBe(201);
    expect(issue.title).toBe("Test Issue");
    expect(issue.type).toBe("story");
    expect(issue.issueNumber).toBeGreaterThanOrEqual(1);
  });

  it("should list issues for a project", async () => {
    const app = await getApp();
    const { accessToken, project } = await setupProjectWithIssue(app);

    const res = await app.inject({
      method: "GET",
      url: `/api/v1/projects/${project.id}/issues`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    const body = JSON.parse(res.body);
    expect(res.statusCode).toBe(200);
    expect(body.data.length).toBeGreaterThanOrEqual(1);
  });

  it("should get a single issue by ID", async () => {
    const app = await getApp();
    const { accessToken, project, issue } = await setupProjectWithIssue(app);

    const res = await app.inject({
      method: "GET",
      url: `/api/v1/projects/${project.id}/issues/${issue.id}`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    const body = JSON.parse(res.body);
    expect(res.statusCode).toBe(200);
    expect(body.data.id).toBe(issue.id);
    expect(body.data.title).toBe("Test Issue");
  });

  it("should update an issue", async () => {
    const app = await getApp();
    const { accessToken, project, issue } = await setupProjectWithIssue(app);

    const res = await app.inject({
      method: "PATCH",
      url: `/api/v1/projects/${project.id}/issues/${issue.id}`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { title: "Updated Title", priority: "high" },
    });

    const body = JSON.parse(res.body);
    expect(res.statusCode).toBe(200);
    expect(body.data.title).toBe("Updated Title");
    expect(body.data.priority).toBe("high");
  });

  it("should delete an issue", async () => {
    const app = await getApp();
    const { accessToken, project, issue } = await setupProjectWithIssue(app);

    const res = await app.inject({
      method: "DELETE",
      url: `/api/v1/projects/${project.id}/issues/${issue.id}`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(res.statusCode).toBe(200);

    // Verify it's gone
    const getRes = await app.inject({
      method: "GET",
      url: `/api/v1/projects/${project.id}/issues/${issue.id}`,
      headers: { authorization: `Bearer ${accessToken}` },
    });
    expect(getRes.statusCode).toBe(404);
  });

  it("should reject issue creation without auth", async () => {
    const app = await getApp();
    const { accessToken, project } = await setupProjectWithIssue(app);

    const res = await app.inject({
      method: "POST",
      url: `/api/v1/projects/${project.id}/issues`,
      payload: { type: "task", title: "No Auth", priority: "low" },
    });

    expect(res.statusCode).toBe(401);
  });

  it("should reject empty title", async () => {
    const app = await getApp();
    const { accessToken, project } = await setupProjectWithIssue(app);

    const res = await app.inject({
      method: "POST",
      url: `/api/v1/projects/${project.id}/issues`,
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { type: "task", title: "", priority: "low" },
    });

    expect(res.statusCode).toBe(400);
  });
});
