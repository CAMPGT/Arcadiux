import { z } from "zod";
import {
  loginSchema,
  registerSchema,
} from "@arcadiux/shared/validators";

export { loginSchema, registerSchema };

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required"),
});

export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;

// Response schemas for serialization
export const authTokensResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    accessToken: z.string(),
    refreshToken: z.string(),
    user: z.object({
      id: z.string(),
      email: z.string(),
      fullName: z.string(),
      avatarUrl: z.string().nullable(),
    }),
  }),
});

export const meResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    id: z.string(),
    email: z.string(),
    fullName: z.string(),
    avatarUrl: z.string().nullable(),
    isActive: z.boolean().nullable(),
    createdAt: z.string().nullable(),
    updatedAt: z.string().nullable(),
  }),
});
