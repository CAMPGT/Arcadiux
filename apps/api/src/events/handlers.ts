import { db } from "@arcadiux/db";
import { activityLog } from "@arcadiux/db/schema";
import { eventEmitter, type AppEvents } from "./emitter.js";
import type { FastifyBaseLogger } from "fastify";

export function setupEventHandlers(logger: FastifyBaseLogger): void {
  // Issue created
  eventEmitter.on("issue.created", async (data) => {
    try {
      await db.insert(activityLog).values({
        issueId: data.issueId,
        userId: data.userId,
        action: "created",
        fieldName: null,
        oldValue: null,
        newValue: null,
      });
    } catch (err) {
      logger.error(err, "Failed to log issue.created activity");
    }
  });

  // Issue field updated
  eventEmitter.on("issue.updated", async (data) => {
    try {
      await db.insert(activityLog).values({
        issueId: data.issueId,
        userId: data.userId,
        action: "updated",
        fieldName: data.fieldName,
        oldValue: data.oldValue,
        newValue: data.newValue,
      });
    } catch (err) {
      logger.error(err, "Failed to log issue.updated activity");
    }
  });

  // Issue transitioned (status change)
  eventEmitter.on("issue.transitioned", async (data) => {
    try {
      await db.insert(activityLog).values({
        issueId: data.issueId,
        userId: data.userId,
        action: "transitioned",
        fieldName: "statusId",
        oldValue: data.fromStatusId,
        newValue: data.toStatusId,
      });
    } catch (err) {
      logger.error(err, "Failed to log issue.transitioned activity");
    }
  });

  // Issue deleted
  eventEmitter.on("issue.deleted", async (data) => {
    try {
      logger.info(
        { issueId: data.issueId, userId: data.userId, projectId: data.projectId },
        "Issue deleted",
      );
    } catch (err) {
      logger.error(err, "Failed to handle issue.deleted");
    }
  });

  // Comment created
  eventEmitter.on("comment.created", async (data) => {
    try {
      await db.insert(activityLog).values({
        issueId: data.issueId,
        userId: data.userId,
        action: "commented",
        fieldName: null,
        oldValue: null,
        newValue: data.commentId,
      });
    } catch (err) {
      logger.error(err, "Failed to log comment.created activity");
    }
  });

  // Comment updated
  eventEmitter.on("comment.updated", async (data) => {
    try {
      await db.insert(activityLog).values({
        issueId: data.issueId,
        userId: data.userId,
        action: "comment_updated",
        fieldName: null,
        oldValue: null,
        newValue: data.commentId,
      });
    } catch (err) {
      logger.error(err, "Failed to log comment.updated activity");
    }
  });

  // Comment deleted
  eventEmitter.on("comment.deleted", async (data) => {
    try {
      await db.insert(activityLog).values({
        issueId: data.issueId,
        userId: data.userId,
        action: "comment_deleted",
        fieldName: null,
        oldValue: data.commentId,
        newValue: null,
      });
    } catch (err) {
      logger.error(err, "Failed to log comment.deleted activity");
    }
  });

  // Sprint started
  eventEmitter.on("sprint.started", async (data) => {
    try {
      logger.info(
        { sprintId: data.sprintId, userId: data.userId, projectId: data.projectId },
        "Sprint started",
      );
    } catch (err) {
      logger.error(err, "Failed to handle sprint.started");
    }
  });

  // Sprint completed
  eventEmitter.on("sprint.completed", async (data) => {
    try {
      logger.info(
        { sprintId: data.sprintId, userId: data.userId, projectId: data.projectId },
        "Sprint completed",
      );
    } catch (err) {
      logger.error(err, "Failed to handle sprint.completed");
    }
  });
}
