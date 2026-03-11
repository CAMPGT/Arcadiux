import { describe, it, expect, afterAll } from "vitest";
import { getApp, closeApp, registerUser, createProject } from "./helpers.js";

afterAll(async () => {
  await closeApp();
});

describe("Projects — CRUD", () => {
  it("should create a project", async () => {
    const app = await getApp();
    const { accessToken } = await registerUser(app);
    const { statusCode, project } = await createProject(app, accessToken!);

    expect(statusCode).toBe(201);
    expect(project.name).toBeDefined();
    expect(project.key).toBeDefined();
    expect(project.projectType).toBe("scrum");
  });

  it("should list user projects", async () => {
    const app = await getApp();
    const { accessToken } = await registerUser(app);
    await createProject(app, accessToken!);

    const res = await app.inject({
      method: "GET",
      url: "/api/v1/projects",
      headers: { authorization: `Bearer ${accessToken}` },
    });

    const body = JSON.parse(res.body);
    expect(res.statusCode).toBe(200);
    expect(body.data.length).toBeGreaterThanOrEqual(1);
  });

  it("should get a single project", async () => {
    const app = await getApp();
    const { accessToken } = await registerUser(app);
    const { project } = await createProject(app, accessToken!);

    const res = await app.inject({
      method: "GET",
      url: `/api/v1/projects/${project.id}`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    const body = JSON.parse(res.body);
    expect(res.statusCode).toBe(200);
    expect(body.data.id).toBe(project.id);
  });

  it("should reject creating project without auth", async () => {
    const app = await getApp();

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/projects",
      payload: { name: "No Auth", key: "NOAU", projectType: "scrum" },
    });

    expect(res.statusCode).toBe(401);
  });

  it("should reject duplicate project key", async () => {
    const app = await getApp();
    const { accessToken } = await registerUser(app);
    const key = `DUP${Date.now().toString(36).slice(-2).toUpperCase()}`;

    await createProject(app, accessToken!, { key });
    const { statusCode } = await createProject(app, accessToken!, { key });

    // Should be 409 (unique constraint) thanks to our error handler
    expect(statusCode).toBe(409);
  });
});
