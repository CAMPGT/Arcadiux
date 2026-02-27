// ─── Project Types ───────────────────────────────────────────────────────────

export const ProjectType = {
  SCRUM: 'scrum',
  KANBAN: 'kanban',
} as const;

export type ProjectType = (typeof ProjectType)[keyof typeof ProjectType];

// ─── Issue Types ─────────────────────────────────────────────────────────────

export const IssueType = {
  EPIC: 'epic',
  STORY: 'story',
  TASK: 'task',
  SUBTASK: 'subtask',
  BUG: 'bug',
} as const;

export type IssueType = (typeof IssueType)[keyof typeof IssueType];

// ─── Issue Categories ────────────────────────────────────────────────────────

export const IssueCategory = {
  NEW_FEATURE: 'nueva_funcionalidad',
  SUPPORT: 'soporte',
  TESTING: 'testeo',
  OTHERS: 'otros',
} as const;

export type IssueCategory = (typeof IssueCategory)[keyof typeof IssueCategory];

export const IssueCategoryLabels: Record<IssueCategory, string> = {
  [IssueCategory.NEW_FEATURE]: 'Nueva funcionalidad',
  [IssueCategory.SUPPORT]: 'Soporte',
  [IssueCategory.TESTING]: 'Testeo',
  [IssueCategory.OTHERS]: 'Otros',
};

// ─── Priority Levels ─────────────────────────────────────────────────────────

export const PriorityLevel = {
  CRITICAL: 'critical',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
} as const;

export type PriorityLevel = (typeof PriorityLevel)[keyof typeof PriorityLevel];

// ─── Sprint Statuses ─────────────────────────────────────────────────────────

export const SprintStatus = {
  PLANNED: 'planned',
  ACTIVE: 'active',
  COMPLETED: 'completed',
} as const;

export type SprintStatus = (typeof SprintStatus)[keyof typeof SprintStatus];

// ─── Project Roles ───────────────────────────────────────────────────────────

export const ProjectRole = {
  ADMIN: 'admin',
  MEMBER: 'member',
  VIEWER: 'viewer',
} as const;

export type ProjectRole = (typeof ProjectRole)[keyof typeof ProjectRole];

// ─── Status Categories ───────────────────────────────────────────────────────

export const StatusCategory = {
  TODO: 'todo',
  IN_PROGRESS: 'in_progress',
  DONE: 'done',
} as const;

export type StatusCategory =
  (typeof StatusCategory)[keyof typeof StatusCategory];

// ─── Retrospective Templates ─────────────────────────────────────────────────

export const RetroTemplate = {
  MAD_SAD_GLAD: 'mad_sad_glad',
  START_STOP_CONTINUE: 'start_stop_continue',
  FOUR_LS: 'four_ls',
  CUSTOM: 'custom',
} as const;

export type RetroTemplate =
  (typeof RetroTemplate)[keyof typeof RetroTemplate];

// ─── Default Retro Template Column Definitions ───────────────────────────────

export interface RetroColumnDefinition {
  name: string;
  color: string;
  position: number;
}

export const DEFAULT_RETRO_TEMPLATES: Record<
  Exclude<RetroTemplate, 'custom'>,
  RetroColumnDefinition[]
> = {
  [RetroTemplate.MAD_SAD_GLAD]: [
    { name: 'Mad', color: '#EF4444', position: 0 },
    { name: 'Sad', color: '#3B82F6', position: 1 },
    { name: 'Glad', color: '#22C55E', position: 2 },
  ],
  [RetroTemplate.START_STOP_CONTINUE]: [
    { name: 'Start', color: '#22C55E', position: 0 },
    { name: 'Stop', color: '#EF4444', position: 1 },
    { name: 'Continue', color: '#3B82F6', position: 2 },
  ],
  [RetroTemplate.FOUR_LS]: [
    { name: 'Liked', color: '#22C55E', position: 0 },
    { name: 'Learned', color: '#3B82F6', position: 1 },
    { name: 'Lacked', color: '#EF4444', position: 2 },
    { name: 'Longed For', color: '#F59E0B', position: 3 },
  ],
};

// ─── Default Workflow Statuses ───────────────────────────────────────────────

export interface WorkflowStatusDefinition {
  name: string;
  category: StatusCategory;
  position: number;
  wipLimit: number | null;
}

export const DEFAULT_WORKFLOW_STATUSES: Record<
  ProjectType,
  WorkflowStatusDefinition[]
> = {
  [ProjectType.SCRUM]: [
    { name: 'Backlog', category: StatusCategory.TODO, position: 0, wipLimit: null },
    { name: 'To Do', category: StatusCategory.TODO, position: 1, wipLimit: null },
    { name: 'Diseño', category: StatusCategory.IN_PROGRESS, position: 2, wipLimit: null },
    { name: 'Desarrollo', category: StatusCategory.IN_PROGRESS, position: 3, wipLimit: null },
    { name: 'Testeo', category: StatusCategory.IN_PROGRESS, position: 4, wipLimit: null },
    { name: 'In Review', category: StatusCategory.IN_PROGRESS, position: 5, wipLimit: null },
    { name: 'Done', category: StatusCategory.DONE, position: 6, wipLimit: null },
    { name: 'Cancelado', category: StatusCategory.DONE, position: 7, wipLimit: null },
  ],
  [ProjectType.KANBAN]: [
    { name: 'Backlog', category: StatusCategory.TODO, position: 0, wipLimit: null },
    { name: 'Ready', category: StatusCategory.TODO, position: 1, wipLimit: null },
    { name: 'In Progress', category: StatusCategory.IN_PROGRESS, position: 2, wipLimit: 5 },
    { name: 'In Review', category: StatusCategory.IN_PROGRESS, position: 3, wipLimit: 3 },
    { name: 'Done', category: StatusCategory.DONE, position: 4, wipLimit: null },
    { name: 'Cancelado', category: StatusCategory.DONE, position: 5, wipLimit: null },
  ],
};

// ─── Numeric Constants ───────────────────────────────────────────────────────

/** Fibonacci-based story point options */
export const STORY_POINT_OPTIONS = [1, 2, 3, 5, 8, 13, 21] as const;

/** Default maximum work-in-progress limit per column */
export const MAX_WIP_DEFAULT = 5;

/** Default sprint duration in days */
export const SPRINT_DURATION_DEFAULT = 14;
