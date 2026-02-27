import { eq, and, desc } from "drizzle-orm";
import { db } from "@arcadiux/db";
import {
  comments,
  issues,
  activityLog,
} from "@arcadiux/db/schema";
import type { CreateCommentInput } from "@arcadiux/shared/validators";
import { eventEmitter } from "../../events/emitter.js";

function serializeComment(comment: any) {
  return {
    ...comment,
    createdAt: comment.createdAt?.toISOString?.() ?? comment.createdAt ?? null,
    updatedAt: comment.updatedAt?.toISOString?.() ?? comment.updatedAt ?? null,
  };
}

export async function createComment(
  projectId: string,
  issueNumber: number,
  input: CreateCommentInput,
  authorId: string,
) {
  // Find the issue by project and issue number
  const issue = await db.query.issues.findFirst({
    where: and(
      eq(issues.projectId, projectId),
      eq(issues.issueNumber, issueNumber),
    ),
  });

  if (!issue) {
    throw Object.assign(new Error("Issue not found"), { statusCode: 404 });
  }

  const [comment] = await db
    .insert(comments)
    .values({
      issueId: issue.id,
      authorId,
      body: input.body,
    })
    .returning();

  eventEmitter.emit("comment.created", {
    issueId: issue.id,
    userId: authorId,
    projectId,
    commentId: comment.id,
  });

  return serializeComment(comment);
}

export async function listComments(
  projectId: string,
  issueNumber: number,
) {
  const issue = await db.query.issues.findFirst({
    where: and(
      eq(issues.projectId, projectId),
      eq(issues.issueNumber, issueNumber),
    ),
  });

  if (!issue) {
    throw Object.assign(new Error("Issue not found"), { statusCode: 404 });
  }

  const result = await db.query.comments.findMany({
    where: eq(comments.issueId, issue.id),
    with: {
      author: {
        columns: { id: true, email: true, fullName: true, avatarUrl: true },
      },
    },
    orderBy: (c, { asc }) => [asc(c.createdAt)],
  });

  return result.map(serializeComment);
}

export async function updateComment(
  commentId: string,
  body: string,
  userId: string,
) {
  const existing = await db.query.comments.findFirst({
    where: eq(comments.id, commentId),
  });

  if (!existing) {
    throw Object.assign(new Error("Comment not found"), { statusCode: 404 });
  }

  if (existing.authorId !== userId) {
    throw Object.assign(
      new Error("You can only edit your own comments"),
      { statusCode: 403 },
    );
  }

  const [updated] = await db
    .update(comments)
    .set({
      body,
      updatedAt: new Date(),
    })
    .where(eq(comments.id, commentId))
    .returning();

  return serializeComment(updated);
}

export async function deleteComment(commentId: string, userId: string) {
  const existing = await db.query.comments.findFirst({
    where: eq(comments.id, commentId),
  });

  if (!existing) {
    throw Object.assign(new Error("Comment not found"), { statusCode: 404 });
  }

  if (existing.authorId !== userId) {
    throw Object.assign(
      new Error("You can only delete your own comments"),
      { statusCode: 403 },
    );
  }

  await db.delete(comments).where(eq(comments.id, commentId));

  return { deleted: true };
}

export async function getActivity(
  projectId: string,
  issueNumber: number,
) {
  const issue = await db.query.issues.findFirst({
    where: and(
      eq(issues.projectId, projectId),
      eq(issues.issueNumber, issueNumber),
    ),
  });

  if (!issue) {
    throw Object.assign(new Error("Issue not found"), { statusCode: 404 });
  }

  const logs = await db.query.activityLog.findMany({
    where: eq(activityLog.issueId, issue.id),
    with: {
      user: {
        columns: { id: true, email: true, fullName: true, avatarUrl: true },
      },
    },
    orderBy: (l, { desc: d }) => [d(l.createdAt)],
    limit: 100,
  });

  return logs.map((log) => ({
    ...log,
    createdAt: log.createdAt?.toISOString() ?? null,
  }));
}
