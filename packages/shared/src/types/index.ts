import type {
  ProjectType,
  IssueType,
  IssueCategory,
  PriorityLevel,
  SprintStatus,
  ProjectRole,
  StatusCategory,
  RetroTemplate,
} from '../constants';

// ─── User ────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── Project ─────────────────────────────────────────────────────────────────

export interface Project {
  id: string;
  name: string;
  key: string;
  description: string | null;
  projectType: ProjectType;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Project Member ──────────────────────────────────────────────────────────

export interface ProjectMember {
  projectId: string;
  userId: string;
  role: ProjectRole;
  joinedAt: string;
}

// ─── Workflow Status ─────────────────────────────────────────────────────────

export interface WorkflowStatus {
  id: string;
  projectId: string;
  name: string;
  category: StatusCategory;
  position: number;
  wipLimit: number | null;
  isActive: boolean;
}

// ─── Workflow Transition ─────────────────────────────────────────────────────

export interface WorkflowTransition {
  id: string;
  projectId: string;
  fromStatusId: string;
  toStatusId: string;
}

// ─── Sprint ──────────────────────────────────────────────────────────────────

export interface Sprint {
  id: string;
  projectId: string;
  name: string;
  goal: string | null;
  status: SprintStatus;
  startDate: string;
  endDate: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Issue ───────────────────────────────────────────────────────────────────

export interface Issue {
  id: string;
  projectId: string;
  issueNumber: number;
  type: IssueType;
  title: string;
  description: string | null;
  statusId: string;
  priority: PriorityLevel;
  assigneeId: string | null;
  responsibleId: string | null;
  reporterId: string;
  parentId: string | null;
  epicId: string | null;
  sprintId: string | null;
  storyPoints: number | null;
  startDate: string | null;
  endDate: string | null;
  category: IssueCategory;
  position: number;
  createdAt: string;
  updatedAt: string;
}

// ─── Responsible ─────────────────────────────────────────────────────────────

export interface Responsible {
  id: string;
  projectId: string;
  fullName: string;
  email: string | null;
  jobTitle: string | null;
  createdAt: string;
}

// ─── Label ───────────────────────────────────────────────────────────────────

export interface Label {
  id: string;
  projectId: string;
  name: string;
  color: string;
}

// ─── Issue Label (join table) ────────────────────────────────────────────────

export interface IssueLabel {
  issueId: string;
  labelId: string;
}

// ─── Comment ─────────────────────────────────────────────────────────────────

export interface Comment {
  id: string;
  issueId: string;
  authorId: string;
  body: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Attachment ──────────────────────────────────────────────────────────────

export interface Attachment {
  id: string;
  issueId: string;
  uploadedBy: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  createdAt: string;
}

// ─── Activity Log ────────────────────────────────────────────────────────────

export interface ActivityLog {
  id: string;
  issueId: string;
  userId: string;
  action: string;
  fieldName: string | null;
  oldValue: string | null;
  newValue: string | null;
  createdAt: string;
}

// ─── Retro Board ─────────────────────────────────────────────────────────────

export interface RetroBoard {
  id: string;
  sprintId: string;
  projectId: string;
  name: string;
  template: RetroTemplate;
  timerSeconds: number;
  timerRunning: boolean;
  timerStartedAt: string | null;
  maxVotes: number;
  isAnonymous: boolean;
  createdAt: string;
}

// ─── Retro Column ────────────────────────────────────────────────────────────

export interface RetroColumn {
  id: string;
  boardId: string;
  name: string;
  position: number;
  color: string;
}

// ─── Retro Note ──────────────────────────────────────────────────────────────

export interface RetroNote {
  id: string;
  columnId: string;
  authorId: string;
  text: string;
  color: string | null;
  position: number;
  isAnonymous: boolean;
  createdAt: string;
}

// ─── Retro Vote ──────────────────────────────────────────────────────────────

export interface RetroVote {
  noteId: string;
  userId: string;
}

// ─── Retro Action Item ──────────────────────────────────────────────────────

export interface RetroActionItem {
  id: string;
  boardId: string;
  noteId: string | null;
  text: string;
  assigneeId: string | null;
  issueId: string | null;
  isDone: boolean;
}

// ─── API Response Types ──────────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  fullName: string;
}
