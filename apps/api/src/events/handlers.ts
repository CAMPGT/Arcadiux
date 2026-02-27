import { db } from "@arcadiux/db";
import { activityLog } from "@arcadiux/db/schema";
import { eventEmitter, type AppEvents } from "./emitter.js";

export function setupEventHandlers(): void {
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
      console.error("Failed to log issue.created activity:", err);
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
      console.error("Failed to log issue.updated activity:", err);
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
      console.error("Failed to log issue.transitioned activity:", err);
    }
  });

  // Issue deleted
  eventEmitter.on("issue.deleted", async (data) => {
    // We cannot write to activity_log after the issue is deleted due to FK constraint
    // This event is for any other side effects (e.g., notifications)
    try {
      console.info(
        `Issue ${data.issueId} deleted by user ${data.userId} in project ${data.projectId}`,
      );
    } catch (err) {
      console.error("Failed to handle issue.deleted:", err);
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
      console.error("Failed to log comment.created activity:", err);
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
      console.error("Failed to log comment.updated activity:", err);
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
      console.error("Failed to log comment.deleted activity:", err);
    }
  });

  // Sprint started
  eventEmitter.on("sprint.started", async (data) => {
    try {
      console.info(
        `Sprint ${data.sprintId} started by user ${data.userId} in project ${data.projectId}`,
      );
    } catch (err) {
      console.error("Failed to handle sprint.started:", err);
    }
  });

  // Sprint completed
  eventEmitter.on("sprint.completed", async (data) => {
    try {
      console.info(
        `Sprint ${data.sprintId} completed by user ${data.userId} in project ${data.projectId}`,
      );
    } catch (err) {
      console.error("Failed to handle sprint.completed:", err);
    }
  });
}
