import { relations } from "drizzle-orm";
import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  integer,
  serial,
  date,
  primaryKey,
  unique,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const projectTypeEnum = pgEnum("project_type", ["scrum", "kanban"]);

export const issueTypeEnum = pgEnum("issue_type", [
  "epic",
  "story",
  "task",
  "subtask",
  "bug",
]);

export const priorityLevelEnum = pgEnum("priority_level", [
  "critical",
  "high",
  "medium",
  "low",
]);

export const sprintStatusEnum = pgEnum("sprint_status", [
  "planned",
  "active",
  "completed",
]);

export const projectRoleEnum = pgEnum("project_role", [
  "admin",
  "member",
  "viewer",
]);

export const statusCategoryEnum = pgEnum("status_category", [
  "todo",
  "in_progress",
  "done",
]);

export const issueCategoryEnum = pgEnum("issue_category", [
  "nueva_funcionalidad",
  "soporte",
  "testeo",
  "funcionalidad_interna",
  "ventas",
  "administracion",
  "otros",
]);

// ---------------------------------------------------------------------------
// Tables
// ---------------------------------------------------------------------------

// ---- users ----------------------------------------------------------------

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).unique().notNull(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  fullName: varchar("full_name", { length: 255 }).notNull(),
  avatarUrl: text("avatar_url"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ---- projects -------------------------------------------------------------

export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  key: varchar("key", { length: 5 }).unique().notNull(),
  description: text("description"),
  projectType: projectTypeEnum("project_type").notNull(),
  ownerId: uuid("owner_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ---- projectMembers -------------------------------------------------------

export const projectMembers = pgTable(
  "project_members",
  {
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: projectRoleEnum("role").notNull().default("member"),
    joinedAt: timestamp("joined_at").defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.projectId, t.userId] })],
);

// ---- workflowStatuses -----------------------------------------------------

export const workflowStatuses = pgTable("workflow_statuses", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 50 }).notNull(),
  category: statusCategoryEnum("category").notNull(),
  position: integer("position").notNull(),
  wipLimit: integer("wip_limit"),
  isActive: boolean("is_active").notNull().default(true),
});

// ---- workflowTransitions --------------------------------------------------

export const workflowTransitions = pgTable("workflow_transitions", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  fromStatusId: uuid("from_status_id")
    .notNull()
    .references(() => workflowStatuses.id, { onDelete: "cascade" }),
  toStatusId: uuid("to_status_id")
    .notNull()
    .references(() => workflowStatuses.id, { onDelete: "cascade" }),
});

// ---- sprints --------------------------------------------------------------

export const sprints = pgTable("sprints", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  goal: text("goal"),
  status: sprintStatusEnum("status").notNull().default("planned"),
  startDate: date("start_date"),
  endDate: date("end_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ---- issues ---------------------------------------------------------------

export const issues = pgTable(
  "issues",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    issueNumber: serial("issue_number").notNull(),
    type: issueTypeEnum("type").notNull(),
    title: varchar("title", { length: 500 }).notNull(),
    description: text("description"),
    statusId: uuid("status_id").references(() => workflowStatuses.id),
    priority: priorityLevelEnum("priority").notNull().default("medium"),
    assigneeId: uuid("assignee_id").references(() => users.id, {
      onDelete: "set null",
    }),
    responsibleId: uuid("responsible_id").references(() => responsibles.id, {
      onDelete: "set null",
    }),
    reporterId: uuid("reporter_id").references(() => users.id, {
      onDelete: "set null",
    }),
    parentId: uuid("parent_id"),
    epicId: uuid("epic_id"),
    sprintId: uuid("sprint_id").references(() => sprints.id, {
      onDelete: "set null",
    }),
    storyPoints: integer("story_points"),
    startDate: date("start_date"),
    endDate: date("end_date"),
    category: issueCategoryEnum("category").notNull().default("otros"),
    position: integer("position").notNull().default(0),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (t) => [
    unique("uq_issues_project_number").on(t.projectId, t.issueNumber),
    index("idx_issues_project_sprint").on(t.projectId, t.sprintId),
    index("idx_issues_project_status").on(t.projectId, t.statusId),
    index("idx_issues_project_backlog")
      .on(t.projectId, t.position)
      .where(sql`sprint_id IS NULL`),
  ],
);

// Self-referencing foreign keys for issues (parentId, epicId)
// These are handled via relations below; Drizzle does not require
// .references() for self-refs when using the relations API, but we add
// explicit SQL references via the `sql` helper in migrations if needed.

// ---- responsibles ---------------------------------------------------------

export const responsibles = pgTable("responsibles", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  fullName: varchar("full_name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }),
  jobTitle: varchar("job_title", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow(),
});

// ---- labels ---------------------------------------------------------------

export const labels = pgTable("labels", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 50 }).notNull(),
  color: varchar("color", { length: 7 }).notNull(),
});

// ---- issueLabels ----------------------------------------------------------

export const issueLabels = pgTable(
  "issue_labels",
  {
    issueId: uuid("issue_id")
      .notNull()
      .references(() => issues.id, { onDelete: "cascade" }),
    labelId: uuid("label_id")
      .notNull()
      .references(() => labels.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.issueId, t.labelId] })],
);

// ---- comments -------------------------------------------------------------

export const comments = pgTable("comments", {
  id: uuid("id").primaryKey().defaultRandom(),
  issueId: uuid("issue_id")
    .notNull()
    .references(() => issues.id, { onDelete: "cascade" }),
  authorId: uuid("author_id").references(() => users.id, {
    onDelete: "set null",
  }),
  body: text("body").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ---- attachments ----------------------------------------------------------

export const attachments = pgTable("attachments", {
  id: uuid("id").primaryKey().defaultRandom(),
  issueId: uuid("issue_id")
    .notNull()
    .references(() => issues.id, { onDelete: "cascade" }),
  uploadedBy: uuid("uploaded_by").references(() => users.id, {
    onDelete: "set null",
  }),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  fileUrl: text("file_url").notNull(),
  fileSize: integer("file_size").notNull(),
  mimeType: varchar("mime_type", { length: 100 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// ---- activityLog ----------------------------------------------------------

export const activityLog = pgTable(
  "activity_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    issueId: uuid("issue_id")
      .notNull()
      .references(() => issues.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    action: varchar("action", { length: 50 }).notNull(),
    fieldName: varchar("field_name", { length: 50 }),
    oldValue: text("old_value"),
    newValue: text("new_value"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => [
    index("idx_activity_issue").on(t.issueId, t.createdAt),
  ],
);

// ---- refreshTokens --------------------------------------------------------

export const refreshTokens = pgTable("refresh_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  tokenHash: varchar("token_hash", { length: 255 }).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// ---- retroBoards ----------------------------------------------------------

export const retroBoards = pgTable("retro_boards", {
  id: uuid("id").primaryKey().defaultRandom(),
  sprintId: uuid("sprint_id").references(() => sprints.id, {
    onDelete: "set null",
  }),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  template: varchar("template", { length: 50 }).notNull().default("mad_sad_glad"),
  timerSeconds: integer("timer_seconds").notNull().default(300),
  timerRunning: boolean("timer_running").notNull().default(false),
  timerStartedAt: timestamp("timer_started_at"),
  maxVotes: integer("max_votes").notNull().default(3),
  isAnonymous: boolean("is_anonymous").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// ---- retroColumns ---------------------------------------------------------

export const retroColumns = pgTable("retro_columns", {
  id: uuid("id").primaryKey().defaultRandom(),
  boardId: uuid("board_id")
    .notNull()
    .references(() => retroBoards.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 100 }).notNull(),
  position: integer("position").notNull(),
  color: varchar("color", { length: 7 }).notNull(),
});

// ---- retroNotes -----------------------------------------------------------

export const retroNotes = pgTable("retro_notes", {
  id: uuid("id").primaryKey().defaultRandom(),
  columnId: uuid("column_id")
    .notNull()
    .references(() => retroColumns.id, { onDelete: "cascade" }),
  authorId: uuid("author_id").references(() => users.id, {
    onDelete: "set null",
  }),
  text: text("text").notNull(),
  color: varchar("color", { length: 7 }),
  position: integer("position").notNull().default(0),
  isAnonymous: boolean("is_anonymous").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// ---- retroVotes -----------------------------------------------------------

export const retroVotes = pgTable(
  "retro_votes",
  {
    noteId: uuid("note_id")
      .notNull()
      .references(() => retroNotes.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.noteId, t.userId] })],
);

// ---- retroActionItems -----------------------------------------------------

export const retroActionItems = pgTable("retro_action_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  boardId: uuid("board_id")
    .notNull()
    .references(() => retroBoards.id, { onDelete: "cascade" }),
  noteId: uuid("note_id").references(() => retroNotes.id, {
    onDelete: "set null",
  }),
  text: text("text").notNull(),
  assigneeId: uuid("assignee_id").references(() => users.id, {
    onDelete: "set null",
  }),
  issueId: uuid("issue_id").references(() => issues.id, {
    onDelete: "set null",
  }),
  isDone: boolean("is_done").notNull().default(false),
});

// ---------------------------------------------------------------------------
// Relations
// ---------------------------------------------------------------------------

// ---- users relations ------------------------------------------------------

export const usersRelations = relations(users, ({ many }) => ({
  ownedProjects: many(projects),
  projectMemberships: many(projectMembers),
  assignedIssues: many(issues, { relationName: "issueAssignee" }),
  reportedIssues: many(issues, { relationName: "issueReporter" }),
  comments: many(comments),
  attachments: many(attachments),
  activityLogs: many(activityLog),
  refreshTokens: many(refreshTokens),
  retroNotes: many(retroNotes),
  retroVotes: many(retroVotes),
  retroActionItems: many(retroActionItems),
}));

// ---- projects relations ---------------------------------------------------

export const projectsRelations = relations(projects, ({ one, many }) => ({
  owner: one(users, {
    fields: [projects.ownerId],
    references: [users.id],
  }),
  members: many(projectMembers),
  workflowStatuses: many(workflowStatuses),
  workflowTransitions: many(workflowTransitions),
  sprints: many(sprints),
  issues: many(issues),
  labels: many(labels),
  responsibles: many(responsibles),
  retroBoards: many(retroBoards),
}));

// ---- projectMembers relations ---------------------------------------------

export const projectMembersRelations = relations(projectMembers, ({ one }) => ({
  project: one(projects, {
    fields: [projectMembers.projectId],
    references: [projects.id],
  }),
  user: one(users, {
    fields: [projectMembers.userId],
    references: [users.id],
  }),
}));

// ---- workflowStatuses relations -------------------------------------------

export const workflowStatusesRelations = relations(
  workflowStatuses,
  ({ one, many }) => ({
    project: one(projects, {
      fields: [workflowStatuses.projectId],
      references: [projects.id],
    }),
    issues: many(issues),
    transitionsFrom: many(workflowTransitions, {
      relationName: "transitionFrom",
    }),
    transitionsTo: many(workflowTransitions, {
      relationName: "transitionTo",
    }),
  }),
);

// ---- workflowTransitions relations ----------------------------------------

export const workflowTransitionsRelations = relations(
  workflowTransitions,
  ({ one }) => ({
    project: one(projects, {
      fields: [workflowTransitions.projectId],
      references: [projects.id],
    }),
    fromStatus: one(workflowStatuses, {
      fields: [workflowTransitions.fromStatusId],
      references: [workflowStatuses.id],
      relationName: "transitionFrom",
    }),
    toStatus: one(workflowStatuses, {
      fields: [workflowTransitions.toStatusId],
      references: [workflowStatuses.id],
      relationName: "transitionTo",
    }),
  }),
);

// ---- sprints relations ----------------------------------------------------

export const sprintsRelations = relations(sprints, ({ one, many }) => ({
  project: one(projects, {
    fields: [sprints.projectId],
    references: [projects.id],
  }),
  issues: many(issues),
  retroBoards: many(retroBoards),
}));

// ---- issues relations -----------------------------------------------------

export const issuesRelations = relations(issues, ({ one, many }) => ({
  project: one(projects, {
    fields: [issues.projectId],
    references: [projects.id],
  }),
  status: one(workflowStatuses, {
    fields: [issues.statusId],
    references: [workflowStatuses.id],
  }),
  assignee: one(users, {
    fields: [issues.assigneeId],
    references: [users.id],
    relationName: "issueAssignee",
  }),
  responsible: one(responsibles, {
    fields: [issues.responsibleId],
    references: [responsibles.id],
  }),
  reporter: one(users, {
    fields: [issues.reporterId],
    references: [users.id],
    relationName: "issueReporter",
  }),
  parent: one(issues, {
    fields: [issues.parentId],
    references: [issues.id],
    relationName: "issueParent",
  }),
  children: many(issues, { relationName: "issueParent" }),
  epic: one(issues, {
    fields: [issues.epicId],
    references: [issues.id],
    relationName: "issueEpic",
  }),
  epicChildren: many(issues, { relationName: "issueEpic" }),
  sprint: one(sprints, {
    fields: [issues.sprintId],
    references: [sprints.id],
  }),
  issueLabels: many(issueLabels),
  comments: many(comments),
  attachments: many(attachments),
  activityLogs: many(activityLog),
  retroActionItems: many(retroActionItems),
}));

// ---- labels relations -----------------------------------------------------

export const labelsRelations = relations(labels, ({ one, many }) => ({
  project: one(projects, {
    fields: [labels.projectId],
    references: [projects.id],
  }),
  issueLabels: many(issueLabels),
}));

// ---- responsibles relations -----------------------------------------------

export const responsiblesRelations = relations(responsibles, ({ one, many }) => ({
  project: one(projects, {
    fields: [responsibles.projectId],
    references: [projects.id],
  }),
  issues: many(issues),
}));

// ---- issueLabels relations ------------------------------------------------

export const issueLabelsRelations = relations(issueLabels, ({ one }) => ({
  issue: one(issues, {
    fields: [issueLabels.issueId],
    references: [issues.id],
  }),
  label: one(labels, {
    fields: [issueLabels.labelId],
    references: [labels.id],
  }),
}));

// ---- comments relations ---------------------------------------------------

export const commentsRelations = relations(comments, ({ one }) => ({
  issue: one(issues, {
    fields: [comments.issueId],
    references: [issues.id],
  }),
  author: one(users, {
    fields: [comments.authorId],
    references: [users.id],
  }),
}));

// ---- attachments relations ------------------------------------------------

export const attachmentsRelations = relations(attachments, ({ one }) => ({
  issue: one(issues, {
    fields: [attachments.issueId],
    references: [issues.id],
  }),
  uploader: one(users, {
    fields: [attachments.uploadedBy],
    references: [users.id],
  }),
}));

// ---- activityLog relations ------------------------------------------------

export const activityLogRelations = relations(activityLog, ({ one }) => ({
  issue: one(issues, {
    fields: [activityLog.issueId],
    references: [issues.id],
  }),
  user: one(users, {
    fields: [activityLog.userId],
    references: [users.id],
  }),
}));

// ---- refreshTokens relations ----------------------------------------------

export const refreshTokensRelations = relations(refreshTokens, ({ one }) => ({
  user: one(users, {
    fields: [refreshTokens.userId],
    references: [users.id],
  }),
}));

// ---- retroBoards relations ------------------------------------------------

export const retroBoardsRelations = relations(retroBoards, ({ one, many }) => ({
  sprint: one(sprints, {
    fields: [retroBoards.sprintId],
    references: [sprints.id],
  }),
  project: one(projects, {
    fields: [retroBoards.projectId],
    references: [projects.id],
  }),
  columns: many(retroColumns),
  actionItems: many(retroActionItems),
}));

// ---- retroColumns relations -----------------------------------------------

export const retroColumnsRelations = relations(retroColumns, ({ one, many }) => ({
  board: one(retroBoards, {
    fields: [retroColumns.boardId],
    references: [retroBoards.id],
  }),
  notes: many(retroNotes),
}));

// ---- retroNotes relations -------------------------------------------------

export const retroNotesRelations = relations(retroNotes, ({ one, many }) => ({
  column: one(retroColumns, {
    fields: [retroNotes.columnId],
    references: [retroColumns.id],
  }),
  author: one(users, {
    fields: [retroNotes.authorId],
    references: [users.id],
  }),
  votes: many(retroVotes),
  actionItems: many(retroActionItems),
}));

// ---- retroVotes relations -------------------------------------------------

export const retroVotesRelations = relations(retroVotes, ({ one }) => ({
  note: one(retroNotes, {
    fields: [retroVotes.noteId],
    references: [retroNotes.id],
  }),
  user: one(users, {
    fields: [retroVotes.userId],
    references: [users.id],
  }),
}));

// ---- retroActionItems relations -------------------------------------------

export const retroActionItemsRelations = relations(
  retroActionItems,
  ({ one }) => ({
    board: one(retroBoards, {
      fields: [retroActionItems.boardId],
      references: [retroBoards.id],
    }),
    note: one(retroNotes, {
      fields: [retroActionItems.noteId],
      references: [retroNotes.id],
    }),
    assignee: one(users, {
      fields: [retroActionItems.assigneeId],
      references: [users.id],
    }),
    issue: one(issues, {
      fields: [retroActionItems.issueId],
      references: [issues.id],
    }),
  }),
);
