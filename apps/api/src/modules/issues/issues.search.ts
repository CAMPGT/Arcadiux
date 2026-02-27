import { sql, eq, and } from "drizzle-orm";
import { db } from "@arcadiux/db";
import { issues, projects } from "@arcadiux/db/schema";

export interface SearchResult {
  id: string;
  projectId: string;
  projectKey: string;
  issueNumber: number;
  type: string;
  title: string;
  description: string | null;
  priority: string;
  rank: number;
}

export async function fullTextSearch(
  query: string,
  projectKey?: string,
  userId?: string,
  limit: number = 50,
): Promise<SearchResult[]> {
  // Sanitize query for tsquery — replace special chars, add :* for prefix matching
  const sanitized = query
    .replace(/[^\w\s]/g, " ")
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0)
    .map((w) => `${w}:*`)
    .join(" & ");

  if (!sanitized) {
    return [];
  }

  const conditions = [];

  if (projectKey) {
    conditions.push(sql`p."key" = ${projectKey}`);
  }

  const whereClause =
    conditions.length > 0
      ? sql`WHERE ${sql.join(conditions, sql` AND `)}`
      : sql``;

  const results = await db.execute(sql`
    SELECT
      i.id,
      i.project_id AS "projectId",
      p."key" AS "projectKey",
      i.issue_number AS "issueNumber",
      i.type,
      i.title,
      i.description,
      i.priority,
      ts_rank(
        to_tsvector('english', COALESCE(i.title, '') || ' ' || COALESCE(i.description, '')),
        to_tsquery('english', ${sanitized})
      ) AS rank
    FROM issues i
    JOIN projects p ON p.id = i.project_id
    ${whereClause}
    AND to_tsvector('english', COALESCE(i.title, '') || ' ' || COALESCE(i.description, ''))
        @@ to_tsquery('english', ${sanitized})
    ORDER BY rank DESC
    LIMIT ${limit}
  `);

  return results as unknown as SearchResult[];
}
