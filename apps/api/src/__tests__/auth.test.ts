import { describe, it, expect, afterAll } from "vitest";
import { getApp, closeApp, registerUser, loginUser, uniqueEmail } from "./helpers.js";

afterAll(async () => {
  await closeApp();
});

describe("Auth — Register", () => {
  it("should register a new user and return tokens", async () => {
    const app = await getApp();
    const result = await registerUser(app);

    expect(result.statusCode).toBe(201);
    expect(result.body.success).toBe(true);
    expect(result.body.data.accessToken).toBeDefined();
    expect(result.body.data.user.email).toBe(result.email);
    expect(result.body.data.user.fullName).toBe("Test User");
    expect(result.refreshCookie).toBeDefined();
  });

  it("should reject duplicate email", async () => {
    const app = await getApp();
    const email = uniqueEmail();

    await registerUser(app, { email });
    const result = await registerUser(app, { email });

    expect(result.statusCode).toBe(409);
    expect(result.body.success).toBe(false);
  });

  it("should reject short password", async () => {
    const app = await getApp();

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/auth/register",
      payload: { email: uniqueEmail(), password: "short", fullName: "Test" },
    });

    expect(res.statusCode).toBe(400);
  });

  it("should reject invalid email", async () => {
    const app = await getApp();

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/auth/register",
      payload: { email: "not-an-email", password: "TestPassword123!", fullName: "Test" },
    });

    expect(res.statusCode).toBe(400);
  });
});

describe("Auth — Login", () => {
  it("should login with correct credentials", async () => {
    const app = await getApp();
    const { email, password } = await registerUser(app);
    const result = await loginUser(app, email, password);

    expect(result.statusCode).toBe(200);
    expect(result.body.success).toBe(true);
    expect(result.accessToken).toBeDefined();
    expect(result.refreshCookie).toBeDefined();
  });

  it("should reject wrong password", async () => {
    const app = await getApp();
    const { email } = await registerUser(app);
    const result = await loginUser(app, email, "WrongPassword123!");

    expect(result.statusCode).toBe(401);
    expect(result.body.success).toBe(false);
  });

  it("should reject non-existent email", async () => {
    const app = await getApp();
    const result = await loginUser(app, "nonexistent@test.com", "whatever123!");

    expect(result.statusCode).toBe(401);
  });
});

describe("Auth — Refresh", () => {
  it("should refresh access token using cookie", async () => {
    const app = await getApp();
    const { refreshCookie } = await registerUser(app);

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/auth/refresh",
      cookies: { refresh_token: refreshCookie! },
    });

    const body = JSON.parse(res.body);
    expect(res.statusCode).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.accessToken).toBeDefined();
  });

  it("should reject refresh without cookie", async () => {
    const app = await getApp();

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/auth/refresh",
    });

    expect(res.statusCode).toBe(401);
  });

  it("should reject reuse of rotated refresh token", async () => {
    const app = await getApp();
    const { refreshCookie } = await registerUser(app);

    // Use the refresh token once (rotates it)
    await app.inject({
      method: "POST",
      url: "/api/v1/auth/refresh",
      cookies: { refresh_token: refreshCookie! },
    });

    // Try to reuse the old token
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/auth/refresh",
      cookies: { refresh_token: refreshCookie! },
    });

    expect(res.statusCode).toBe(401);
  });
});

describe("Auth — Me", () => {
  it("should return current user with valid token", async () => {
    const app = await getApp();
    const { accessToken, email } = await registerUser(app);

    const res = await app.inject({
      method: "GET",
      url: "/api/v1/auth/me",
      headers: { authorization: `Bearer ${accessToken}` },
    });

    const body = JSON.parse(res.body);
    expect(res.statusCode).toBe(200);
    expect(body.data.email).toBe(email);
  });

  it("should reject request without token", async () => {
    const app = await getApp();

    const res = await app.inject({
      method: "GET",
      url: "/api/v1/auth/me",
    });

    expect(res.statusCode).toBe(401);
  });
});
