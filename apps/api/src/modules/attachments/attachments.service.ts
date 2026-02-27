import { eq, and } from "drizzle-orm";
import { db } from "@arcadiux/db";
import { attachments, issues } from "@arcadiux/db/schema";
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { config } from "../../config/index.js";
import crypto from "node:crypto";

let s3Client: S3Client | null = null;

function getS3Client(): S3Client {
  if (!s3Client) {
    if (!config.S3_ENDPOINT || !config.S3_ACCESS_KEY || !config.S3_SECRET_KEY) {
      throw Object.assign(
        new Error("S3 storage is not configured"),
        { statusCode: 500 },
      );
    }

    s3Client = new S3Client({
      endpoint: config.S3_ENDPOINT,
      region: config.S3_REGION ?? "us-east-1",
      credentials: {
        accessKeyId: config.S3_ACCESS_KEY,
        secretAccessKey: config.S3_SECRET_KEY,
      },
      forcePathStyle: true,
    });
  }
  return s3Client;
}

export async function uploadAttachment(
  projectId: string,
  issueNumber: number,
  file: {
    filename: string;
    mimetype: string;
    data: Buffer;
  },
  uploadedBy: string,
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

  const fileKey = `${projectId}/${issue.id}/${crypto.randomUUID()}-${file.filename}`;

  const client = getS3Client();
  const bucket = config.S3_BUCKET ?? "arcadiux-attachments";

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: fileKey,
      Body: file.data,
      ContentType: file.mimetype,
    }),
  );

  const fileUrl = `${config.S3_ENDPOINT}/${bucket}/${fileKey}`;

  const [attachment] = await db
    .insert(attachments)
    .values({
      issueId: issue.id,
      uploadedBy,
      fileName: file.filename,
      fileUrl,
      fileSize: file.data.length,
      mimeType: file.mimetype,
    })
    .returning();

  return {
    ...attachment,
    createdAt: attachment.createdAt?.toISOString() ?? null,
  };
}

export async function listAttachments(
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

  const result = await db.query.attachments.findMany({
    where: eq(attachments.issueId, issue.id),
    with: {
      uploader: {
        columns: { id: true, email: true, fullName: true, avatarUrl: true },
      },
    },
    orderBy: (a, { desc }) => [desc(a.createdAt)],
  });

  return result.map((a) => ({
    ...a,
    createdAt: a.createdAt?.toISOString() ?? null,
  }));
}

export async function deleteAttachment(
  attachmentId: string,
  userId: string,
) {
  const existing = await db.query.attachments.findFirst({
    where: eq(attachments.id, attachmentId),
  });

  if (!existing) {
    throw Object.assign(new Error("Attachment not found"), {
      statusCode: 404,
    });
  }

  // Try to delete from S3
  try {
    const client = getS3Client();
    const bucket = config.S3_BUCKET ?? "arcadiux-attachments";

    // Extract key from URL
    const urlPath = new URL(existing.fileUrl).pathname;
    const key = urlPath.replace(`/${bucket}/`, "");

    await client.send(
      new DeleteObjectCommand({
        Bucket: bucket,
        Key: key,
      }),
    );
  } catch (err) {
    // Log but don't fail if S3 delete fails
    console.error("Failed to delete file from S3:", err);
  }

  await db.delete(attachments).where(eq(attachments.id, attachmentId));

  return { deleted: true };
}
