import { buildApp } from "../app.js";
import type { FastifyInstance } from "fastify";

let app: FastifyInstance | null = null;

export async function getApp(): Promise<FastifyInstance> {
  if (!app) {
    app = await buildApp();
    await app.ready();
  }
  return app;
}

export async function closeApp(): Promise<void> {
  if (app) {
    await app.close();
    app = null;
  }
}

// Generate a unique email for test isolation
let counter = 0;
export function uniqueEmail(): string {
  counter++;
  return `test-${Date.now()}-${counter}@arcadiux-test.com`;
}

// Register a user and return tokens + user data
export async function registerUser(
  fastify: FastifyInstance,
  overrides?: { email?: string; password?: string; fullName?: string },
) {
  const email = overrides?.email ?? uniqueEmail();
  const password = overrides?.password ?? "TestPassword123!";
  const fullName = overrides?.fullName ?? "Test User";

  const res = await fastify.inject({
    method: "POST",
    url: "/api/v1/auth/register",
    payload: { email, password, fullName },
  });

  const body = JSON.parse(res.body);
  return {
    statusCode: res.statusCode,
    body,
    email,
    password,
    accessToken: body.data?.accessToken as string | undefined,
    refreshCookie: res.cookies.find((c) => c.name === "refresh_token")?.value,
  };
}

// Login and return tokens
export async function loginUser(
  fastify: FastifyInstance,
  email: string,
  password: string,
) {
  const res = await fastify.inject({
    method: "POST",
    url: "/api/v1/auth/login",
    payload: { email, password },
  });

  const body = JSON.parse(res.body);
  return {
    statusCode: res.statusCode,
    body,
    accessToken: body.data?.accessToken as string | undefined,
    refreshCookie: res.cookies.find((c) => c.name === "refresh_token")?.value,
  };
}

// Create a project and return it
export async function createProject(
  fastify: FastifyInstance,
  accessToken: string,
  overrides?: { name?: string; key?: string; projectType?: string },
) {
  const name = overrides?.name ?? `Test Project ${Date.now()}`;
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const rnd = () => letters[Math.floor(Math.random() * 26)];
  const key = overrides?.key ?? `T${rnd()}${rnd()}${rnd()}`;
  const projectType = overrides?.projectType ?? "scrum";

  const res = await fastify.inject({
    method: "POST",
    url: "/api/v1/projects",
    headers: { authorization: `Bearer ${accessToken}` },
    payload: { name, key, projectType },
  });

  const body = JSON.parse(res.body);
  return {
    statusCode: res.statusCode,
    body,
    project: body.data,
  };
}
