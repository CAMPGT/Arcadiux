import bcrypt from "bcrypt";
import { eq, and, gt } from "drizzle-orm";
import { db } from "@arcadiux/db";
import { users, refreshTokens } from "@arcadiux/db/schema";
import type { FastifyInstance } from "fastify";
import type { RegisterInput, LoginInput } from "@arcadiux/shared/validators";
import { config } from "../../config/index.js";
import crypto from "node:crypto";

const SALT_ROUNDS = 12;
const REFRESH_TOKEN_EXPIRY_DAYS = 30;

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

function generateRefreshToken(): string {
  return crypto.randomBytes(48).toString("hex");
}

async function hashRefreshToken(token: string): Promise<string> {
  return crypto.createHash("sha256").update(token).digest("hex");
}

async function generateTokens(
  app: FastifyInstance,
  userId: string,
  email: string,
  fullName: string,
): Promise<TokenPair> {
  const accessToken = app.jwt.sign({
    sub: userId,
    email,
    fullName,
  });

  const rawRefreshToken = generateRefreshToken();
  const tokenHash = await hashRefreshToken(rawRefreshToken);

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);

  await db.insert(refreshTokens).values({
    userId,
    tokenHash,
    expiresAt,
  });

  return {
    accessToken,
    refreshToken: rawRefreshToken,
  };
}

export async function register(
  app: FastifyInstance,
  input: RegisterInput,
) {
  // Check if user already exists
  const existing = await db.query.users.findFirst({
    where: eq(users.email, input.email),
  });

  if (existing) {
    throw Object.assign(new Error("User with this email already exists"), {
      statusCode: 409,
    });
  }

  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);

  const [user] = await db
    .insert(users)
    .values({
      email: input.email,
      passwordHash,
      fullName: input.fullName,
    })
    .returning({
      id: users.id,
      email: users.email,
      fullName: users.fullName,
      avatarUrl: users.avatarUrl,
    });

  const tokens = await generateTokens(
    app,
    user.id,
    user.email,
    user.fullName,
  );

  return {
    ...tokens,
    user,
  };
}

export async function login(app: FastifyInstance, input: LoginInput) {
  const user = await db.query.users.findFirst({
    where: eq(users.email, input.email),
  });

  if (!user) {
    throw Object.assign(new Error("Invalid email or password"), {
      statusCode: 401,
    });
  }

  if (!user.isActive) {
    throw Object.assign(new Error("Account is deactivated"), {
      statusCode: 403,
    });
  }

  const valid = await bcrypt.compare(input.password, user.passwordHash);

  if (!valid) {
    throw Object.assign(new Error("Invalid email or password"), {
      statusCode: 401,
    });
  }

  const tokens = await generateTokens(
    app,
    user.id,
    user.email,
    user.fullName,
  );

  return {
    ...tokens,
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      avatarUrl: user.avatarUrl,
    },
  };
}

export async function refresh(app: FastifyInstance, rawRefreshToken: string) {
  const tokenHash = await hashRefreshToken(rawRefreshToken);

  // Find the refresh token
  const storedToken = await db.query.refreshTokens.findFirst({
    where: and(
      eq(refreshTokens.tokenHash, tokenHash),
      gt(refreshTokens.expiresAt, new Date()),
    ),
    with: {
      user: true,
    },
  });

  if (!storedToken) {
    throw Object.assign(new Error("Invalid or expired refresh token"), {
      statusCode: 401,
    });
  }

  // Delete the used token (rotation)
  await db
    .delete(refreshTokens)
    .where(eq(refreshTokens.id, storedToken.id));

  const user = storedToken.user;

  if (!user.isActive) {
    throw Object.assign(new Error("Account is deactivated"), {
      statusCode: 403,
    });
  }

  // Generate new token pair
  const tokens = await generateTokens(
    app,
    user.id,
    user.email,
    user.fullName,
  );

  return {
    ...tokens,
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      avatarUrl: user.avatarUrl,
    },
  };
}

export async function getMe(userId: string) {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: {
      id: true,
      email: true,
      fullName: true,
      avatarUrl: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    throw Object.assign(new Error("User not found"), { statusCode: 404 });
  }

  return {
    ...user,
    createdAt: user.createdAt?.toISOString() ?? null,
    updatedAt: user.updatedAt?.toISOString() ?? null,
  };
}
