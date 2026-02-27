import { z } from "zod";
import {
  createIssueSchema,
  updateIssueSchema,
  transitionIssueSchema,
} from "@arcadiux/shared/validators";

export { createIssueSchema, updateIssueSchema, transitionIssueSchema };

export const issueParamsSchema = z.object({
  projectKey: z.string(),
  issueIdentifier: z.string(),
});

export const issueListQuerySchema = z.object({
  type: z.enum(["epic", "story", "task", "subtask", "bug"]).optional(),
  statusId: z.string().uuid().optional(),
  priority: z.enum(["critical", "high", "medium", "low"]).optional(),
  assigneeId: z.string().uuid().optional(),
  sprintId: z.string().uuid().optional(),
  epicId: z.string().uuid().optional(),
  parentId: z.string().uuid().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(50),
  search: z.string().optional(),
});

export type IssueListQuery = z.infer<typeof issueListQuerySchema>;
