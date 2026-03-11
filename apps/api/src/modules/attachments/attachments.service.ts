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
import path from "node:path";
import fs from "node:fs";
import { serializeDates } from "../../utils/serialize.js";

const UPLOADS_DIR = path.resolve(process.cwd(), "uploads");

// Use local storage when S3 is not configured.
// When S3 fails, temporarily fall back to local for S3_RETRY_INTERVAL_MS.
let s3FailedAt: number | null = null;
const S3_RETRY_INTERVAL_MS = 5 * 60 * 1000; // Retry S3 every 5 minutes

function useLocalStorage(): boolean {
  if (!config.S3_ENDPOINT || !config.S3_ACCESS_KEY || !config.S3_SECRET_KEY) {
    return true;
  }
  // If S3 failed recently, use local until retry interval passes
  if (s3FailedAt && Date.now() - s3FailedAt < S3_RETRY_INTERVAL_MS) {
    return true;
  }
  return false;
}

let s3Client: S3Client | null = null;

function getS3Client(): S3Client {
  if (!s3Client) {
    s3Client = new S3Client({
      endpoint: config.S3_ENDPOINT!,
      region: config.S3_REGION ?? "us-east-1",
      credentials: {
        accessKeyId: config.S3_ACCESS_KEY!,
        secretAccessKey: config.S3_SECRET_KEY!,
      },
      forcePathStyle: true,
    });
  }
  return s3Client;
}

const ALLOWED_EXTENSIONS = new Set([
  ".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".bmp",
  ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx",
  ".txt", ".csv", ".md", ".json", ".xml",
  ".zip", ".rar", ".7z", ".gz", ".tar",
  ".mp4", ".mov", ".avi", ".mp3", ".wav",
]);

function sanitizeFilename(filename: string): string {
  const base = path.basename(filename);
  const sanitized = base.replace(/[^a-zA-Z0-9._-]/g, "_");
  return sanitized || "unnamed";
}

function validateFileExtension(filename: string): void {
  const ext = path.extname(filename).toLowerCase();
  if (ext && !ALLOWED_EXTENSIONS.has(ext)) {
    throw Object.assign(
      new Error(`File type "${ext}" is not allowed`),
      { statusCode: 400 },
    );
  }
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

  validateFileExtension(file.filename);
  const safeName = sanitizeFilename(file.filename);
  const uniqueName = `${crypto.randomUUID()}-${safeName}`;
  let fileUrl: string;

  if (useLocalStorage()) {
    // Local file storage
    const dir = path.join(UPLOADS_DIR, projectId, issue.id);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, uniqueName), file.data);
    fileUrl = `/uploads/${projectId}/${issue.id}/${uniqueName}`;
  } else {
    // S3 storage with fallback to local
    try {
      const fileKey = `${projectId}/${issue.id}/${uniqueName}`;
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

      fileUrl = `${config.S3_ENDPOINT}/${bucket}/${fileKey}`;
    } catch {
      // S3 unreachable — fall back to local storage temporarily
      s3FailedAt = Date.now();
      const dir = path.join(UPLOADS_DIR, projectId, issue.id);
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, uniqueName), file.data);
      fileUrl = `/uploads/${projectId}/${issue.id}/${uniqueName}`;
    }
  }

  const [attachment] = await db
    .insert(attachments)
    .values({
      issueId: issue.id,
      uploadedBy,
      fileName: safeName,
      fileUrl,
      fileSize: file.data.length,
      mimeType: file.mimetype,
    })
    .returning();

  return serializeDates(attachment);
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

  return result.map(serializeDates);
}

export async function deleteAttachment(
  attachmentId: string,
  userId: string,
  projectId: string,
  memberRole: string,
) {
  const existing = await db.query.attachments.findFirst({
    where: eq(attachments.id, attachmentId),
    with: {
      issue: {
        columns: { projectId: true },
      },
    },
  });

  if (!existing || existing.issue.projectId !== projectId) {
    throw Object.assign(new Error("Attachment not found"), {
      statusCode: 404,
    });
  }

  // Only the uploader or an admin can delete
  if (existing.uploadedBy !== userId && memberRole !== "admin") {
    throw Object.assign(new Error("Not authorized to delete this attachment"), {
      statusCode: 403,
    });
  }

  // Try to delete the file
  try {
    if (existing.fileUrl.startsWith("/uploads/")) {
      // Local file — prevent path traversal
      const filePath = path.resolve(process.cwd(), existing.fileUrl.slice(1));
      if (!filePath.startsWith(UPLOADS_DIR)) {
        throw new Error("Invalid file path");
      }
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } else {
      // S3
      const client = getS3Client();
      const bucket = config.S3_BUCKET ?? "arcadiux-attachments";
      const urlPath = new URL(existing.fileUrl).pathname;
      const key = urlPath.replace(`/${bucket}/`, "");
      await client.send(
        new DeleteObjectCommand({ Bucket: bucket, Key: key }),
      );
    }
  } catch (err) {
    console.error("Failed to delete file:", err);
  }

  await db.delete(attachments).where(eq(attachments.id, attachmentId));

  return { deleted: true };
}
