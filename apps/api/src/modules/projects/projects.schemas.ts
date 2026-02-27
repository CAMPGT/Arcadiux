import { z } from "zod";
import {
  createProjectSchema,
  updateProjectSchema,
} from "@arcadiux/shared/validators";

export { createProjectSchema, updateProjectSchema };

export const addMemberSchema = z.object({
  email: z.string().email("Invalid email address"),
  role: z.enum(["admin", "member", "viewer"]).default("member"),
});

export type AddMemberInput = z.infer<typeof addMemberSchema>;

export const updateMemberSchema = z.object({
  role: z.enum(["admin", "member", "viewer"]),
});

export type UpdateMemberInput = z.infer<typeof updateMemberSchema>;

export const projectParamsSchema = z.object({
  projectKey: z.string(),
});

export const memberParamsSchema = z.object({
  projectKey: z.string(),
  userId: z.string().uuid(),
});
