import { eq, and } from "drizzle-orm";
import { db } from "@arcadiux/db";
import { responsibles } from "@arcadiux/db/schema";
import type {
  CreateResponsibleInput,
  UpdateResponsibleInput,
} from "@arcadiux/shared/validators";

function serialize(row: any) {
  return {
    ...row,
    createdAt: row.createdAt?.toISOString?.() ?? row.createdAt ?? null,
  };
}

export async function listResponsibles(projectId: string) {
  const rows = await db.query.responsibles.findMany({
    where: eq(responsibles.projectId, projectId),
    orderBy: (r, { asc }) => [asc(r.fullName)],
  });
  return rows.map(serialize);
}

export async function getResponsible(projectId: string, responsibleId: string) {
  const row = await db.query.responsibles.findFirst({
    where: and(
      eq(responsibles.projectId, projectId),
      eq(responsibles.id, responsibleId),
    ),
  });
  if (!row) {
    throw Object.assign(new Error("Responsible not found"), { statusCode: 404 });
  }
  return serialize(row);
}

export async function createResponsible(
  projectId: string,
  input: CreateResponsibleInput,
) {
  const [row] = await db
    .insert(responsibles)
    .values({
      projectId,
      fullName: input.fullName,
      email: input.email ?? null,
      jobTitle: input.jobTitle ?? null,
    })
    .returning();
  return serialize(row);
}

export async function updateResponsible(
  projectId: string,
  responsibleId: string,
  input: UpdateResponsibleInput,
) {
  const existing = await db.query.responsibles.findFirst({
    where: and(
      eq(responsibles.projectId, projectId),
      eq(responsibles.id, responsibleId),
    ),
  });
  if (!existing) {
    throw Object.assign(new Error("Responsible not found"), { statusCode: 404 });
  }

  const [updated] = await db
    .update(responsibles)
    .set(input)
    .where(eq(responsibles.id, responsibleId))
    .returning();
  return serialize(updated);
}

export async function deleteResponsible(
  projectId: string,
  responsibleId: string,
) {
  const existing = await db.query.responsibles.findFirst({
    where: and(
      eq(responsibles.projectId, projectId),
      eq(responsibles.id, responsibleId),
    ),
  });
  if (!existing) {
    throw Object.assign(new Error("Responsible not found"), { statusCode: 404 });
  }

  await db
    .delete(responsibles)
    .where(eq(responsibles.id, responsibleId));
  return { deleted: true };
}
