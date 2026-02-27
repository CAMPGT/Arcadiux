import { z } from 'zod';
import {
  ProjectType,
  IssueType,
  IssueCategory,
  PriorityLevel,
  RetroTemplate,
} from '../constants';

// ─── Auth Schemas ────────────────────────────────────────────────────────────

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters'),
  fullName: z
    .string()
    .min(1, 'Full name is required')
    .max(255, 'Full name must be at most 255 characters'),
});

export type RegisterInput = z.infer<typeof registerSchema>;

// ─── Project Schemas ─────────────────────────────────────────────────────────

export const createProjectSchema = z.object({
  name: z
    .string()
    .min(1, 'Project name is required')
    .max(255, 'Project name must be at most 255 characters'),
  key: z
    .string()
    .regex(
      /^[A-Z]{2,5}$/,
      'Project key must be 2-5 uppercase letters',
    ),
  description: z
    .string()
    .max(2000, 'Description must be at most 2000 characters')
    .optional(),
  projectType: z.enum([ProjectType.SCRUM, ProjectType.KANBAN]),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;

export const updateProjectSchema = createProjectSchema.partial();

export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;

// ─── Issue Schemas ───────────────────────────────────────────────────────────

export const createIssueSchema = z.object({
  type: z.enum([
    IssueType.EPIC,
    IssueType.STORY,
    IssueType.TASK,
    IssueType.SUBTASK,
    IssueType.BUG,
  ]),
  title: z
    .string()
    .min(1, 'Title is required')
    .max(500, 'Title must be at most 500 characters'),
  description: z
    .string()
    .max(50000, 'Description must be at most 50000 characters')
    .optional(),
  priority: z.enum([
    PriorityLevel.CRITICAL,
    PriorityLevel.HIGH,
    PriorityLevel.MEDIUM,
    PriorityLevel.LOW,
  ]),
  assigneeId: z.string().uuid('Invalid assignee ID').optional(),
  responsibleId: z.string().uuid('Invalid responsible ID').optional(),
  parentId: z.string().uuid('Invalid parent ID').optional(),
  epicId: z.string().uuid('Invalid epic ID').optional(),
  sprintId: z.string().uuid('Invalid sprint ID').nullable().optional(),
  storyPoints: z
    .number()
    .int()
    .min(0, 'Story points must be non-negative')
    .optional(),
  startDate: z.string()
    .optional()
    .transform((v) => (v === '' ? undefined : v))
    .pipe(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida (YYYY-MM-DD)').optional()),
  endDate: z.string()
    .optional()
    .transform((v) => (v === '' ? undefined : v))
    .pipe(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida (YYYY-MM-DD)').optional()),
  category: z.enum([
    IssueCategory.NEW_FEATURE,
    IssueCategory.SUPPORT,
    IssueCategory.TESTING,
    IssueCategory.INTERNAL_FEATURE,
    IssueCategory.SALES,
    IssueCategory.ADMINISTRATION,
    IssueCategory.OTHERS,
  ]).optional().default(IssueCategory.OTHERS),
  labels: z
    .array(z.string().uuid('Invalid label ID'))
    .optional(),
});

export type CreateIssueInput = z.infer<typeof createIssueSchema>;
export type CreateIssueFormData = z.input<typeof createIssueSchema>;

export const updateIssueSchema = createIssueSchema.partial().extend({
  statusId: z.string().uuid('Invalid status ID').optional(),
  position: z.number().int().min(0).optional(),
});

export type UpdateIssueInput = z.infer<typeof updateIssueSchema>;
export type UpdateIssueFormData = z.input<typeof updateIssueSchema>;

export const transitionIssueSchema = z.object({
  statusId: z.string().uuid('Invalid status ID'),
});

export type TransitionIssueInput = z.infer<typeof transitionIssueSchema>;

// ─── Sprint Schemas ──────────────────────────────────────────────────────────

export const createSprintSchema = z.object({
  name: z
    .string()
    .min(1, 'Sprint name is required')
    .max(255, 'Sprint name must be at most 255 characters'),
  goal: z
    .string()
    .max(2000, 'Goal must be at most 2000 characters')
    .optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha de inicio inválida (formato: YYYY-MM-DD)'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha de fin inválida (formato: YYYY-MM-DD)'),
});

export type CreateSprintInput = z.infer<typeof createSprintSchema>;

export const updateSprintSchema = createSprintSchema.partial();

export type UpdateSprintInput = z.infer<typeof updateSprintSchema>;

// ─── Comment Schemas ─────────────────────────────────────────────────────────

export const createCommentSchema = z.object({
  body: z
    .string()
    .min(1, 'Comment body is required')
    .max(10000, 'Comment must be at most 10000 characters'),
});

export type CreateCommentInput = z.infer<typeof createCommentSchema>;

// ─── Retro Schemas ───────────────────────────────────────────────────────────

export const createRetroSchema = z.object({
  name: z
    .string()
    .min(1, 'Retro name is required')
    .max(255, 'Retro name must be at most 255 characters'),
  template: z.enum([
    RetroTemplate.MAD_SAD_GLAD,
    RetroTemplate.START_STOP_CONTINUE,
    RetroTemplate.FOUR_LS,
    RetroTemplate.CUSTOM,
  ]),
  timerSeconds: z
    .number()
    .int()
    .min(0, 'Timer seconds must be non-negative')
    .optional()
    .default(300),
  maxVotes: z
    .number()
    .int()
    .min(0, 'Max votes must be non-negative')
    .optional()
    .default(3),
  isAnonymous: z.boolean().optional().default(true),
});

export type CreateRetroInput = z.infer<typeof createRetroSchema>;

export const createRetroNoteSchema = z.object({
  columnId: z.string().uuid('Invalid column ID'),
  text: z
    .string()
    .min(1, 'Note text is required')
    .max(2000, 'Note text must be at most 2000 characters'),
  color: z.string().optional(),
});

export type CreateRetroNoteInput = z.infer<typeof createRetroNoteSchema>;

export const updateRetroNoteSchema = z.object({
  text: z
    .string()
    .min(1, 'Note text is required')
    .max(2000, 'Note text must be at most 2000 characters')
    .optional(),
  position: z.number().int().min(0).optional(),
});

export type UpdateRetroNoteInput = z.infer<typeof updateRetroNoteSchema>;

// ─── Responsible Schemas ─────────────────────────────────────────────────────

export const createResponsibleSchema = z.object({
  fullName: z
    .string()
    .min(1, 'El nombre es requerido')
    .max(255, 'El nombre debe tener máximo 255 caracteres'),
  email: z
    .string()
    .email('Correo electrónico inválido')
    .max(255)
    .optional(),
  jobTitle: z
    .string()
    .max(255, 'El cargo debe tener máximo 255 caracteres')
    .optional(),
});

export type CreateResponsibleInput = z.infer<typeof createResponsibleSchema>;

export const updateResponsibleSchema = createResponsibleSchema.partial();

export type UpdateResponsibleInput = z.infer<typeof updateResponsibleSchema>;

// ─── Reorder Schema ──────────────────────────────────────────────────────────

export const reorderSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.string().uuid('Invalid item ID'),
        position: z.number().int().min(0, 'Position must be non-negative'),
      }),
    )
    .min(1, 'At least one item is required'),
});

export type ReorderInput = z.infer<typeof reorderSchema>;

// ─── Search Schema ───────────────────────────────────────────────────────────

export const searchSchema = z.object({
  q: z.string().min(2, 'Search query must be at least 2 characters'),
  projectKey: z
    .string()
    .regex(/^[A-Z]{2,5}$/, 'Invalid project key')
    .optional(),
});

export type SearchInput = z.infer<typeof searchSchema>;

// ─── AI Schemas ──────────────────────────────────────────────────────────────

export const aiGenerateDescriptionSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(500, 'Title must be at most 500 characters'),
  issueType: z.enum([
    IssueType.EPIC,
    IssueType.STORY,
    IssueType.TASK,
    IssueType.SUBTASK,
    IssueType.BUG,
  ]),
  context: z
    .string()
    .max(5000, 'Context must be at most 5000 characters')
    .optional(),
});

export type AiGenerateDescriptionInput = z.infer<
  typeof aiGenerateDescriptionSchema
>;

export const aiBreakDownEpicSchema = z.object({
  epicTitle: z
    .string()
    .min(1, 'Epic title is required')
    .max(500, 'Epic title must be at most 500 characters'),
  epicDescription: z
    .string()
    .min(1, 'Epic description is required')
    .max(50000, 'Epic description must be at most 50000 characters'),
  projectContext: z
    .string()
    .max(5000, 'Project context must be at most 5000 characters')
    .optional(),
});

export type AiBreakDownEpicInput = z.infer<typeof aiBreakDownEpicSchema>;

export const aiDetectRisksSchema = z.object({
  sprintGoal: z
    .string()
    .min(1, 'Sprint goal is required')
    .max(2000, 'Sprint goal must be at most 2000 characters'),
  issues: z
    .array(
      z.object({
        title: z.string(),
        type: z.enum([
          IssueType.EPIC,
          IssueType.STORY,
          IssueType.TASK,
          IssueType.SUBTASK,
          IssueType.BUG,
        ]),
        priority: z.enum([
          PriorityLevel.CRITICAL,
          PriorityLevel.HIGH,
          PriorityLevel.MEDIUM,
          PriorityLevel.LOW,
        ]),
        storyPoints: z.number().nullable().optional(),
        assigneeId: z.string().nullable().optional(),
      }),
    )
    .min(1, 'At least one issue is required'),
});

export type AiDetectRisksInput = z.infer<typeof aiDetectRisksSchema>;
