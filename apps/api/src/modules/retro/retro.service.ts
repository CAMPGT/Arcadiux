import { eq, and, sql } from "drizzle-orm";
import { db } from "@arcadiux/db";
import {
  retroBoards,
  retroColumns,
  retroNotes,
  retroVotes,
  retroActionItems,
  issues,
  workflowStatuses,
} from "@arcadiux/db/schema";
import type { CreateRetroInput, CreateRetroNoteInput, UpdateRetroNoteInput } from "@arcadiux/shared/validators";
import { DEFAULT_RETRO_TEMPLATES, type RetroTemplate } from "@arcadiux/shared/constants";
import { serializeDates } from "../../utils/serialize.js";

export async function createRetro(
  projectId: string,
  input: CreateRetroInput,
  sprintId?: string,
) {
  return await db.transaction(async (tx) => {
    const [board] = await tx
      .insert(retroBoards)
      .values({
        projectId,
        sprintId: sprintId ?? null,
        name: input.name,
        template: input.template,
        timerSeconds: input.timerSeconds,
        maxVotes: input.maxVotes,
        isAnonymous: input.isAnonymous,
      })
      .returning();

    // Create template columns
    if (input.template !== "custom") {
      const templateDefs =
        DEFAULT_RETRO_TEMPLATES[
          input.template as Exclude<RetroTemplate, "custom">
        ];

      if (templateDefs) {
        await tx.insert(retroColumns).values(
          templateDefs.map((col) => ({
            boardId: board.id,
            name: col.name,
            position: col.position,
            color: col.color,
          })),
        );
      }
    }

    return serializeDates(board);
  });
}

export async function listRetros(projectId: string) {
  const boards = await db.query.retroBoards.findMany({
    where: eq(retroBoards.projectId, projectId),
    orderBy: (rb, { desc }) => [desc(rb.createdAt)],
    limit: 50,
    with: {
      sprint: {
        columns: { id: true, name: true, status: true },
      },
    },
  });

  return boards.map(serializeDates);
}

export async function getRetro(projectId: string, boardId: string) {
  const board = await db.query.retroBoards.findFirst({
    where: and(
      eq(retroBoards.id, boardId),
      eq(retroBoards.projectId, projectId),
    ),
    with: {
      sprint: {
        columns: { id: true, name: true, status: true },
      },
      columns: {
        orderBy: (c, { asc }) => [asc(c.position)],
        with: {
          notes: {
            orderBy: (n, { asc }) => [asc(n.position)],
            with: {
              author: {
                columns: {
                  id: true,
                  email: true,
                  fullName: true,
                  avatarUrl: true,
                },
              },
              votes: true,
            },
          },
        },
      },
      actionItems: {
        with: {
          assignee: {
            columns: {
              id: true,
              email: true,
              fullName: true,
              avatarUrl: true,
            },
          },
          note: {
            columns: { id: true, text: true },
          },
        },
      },
    },
  });

  if (!board) {
    throw Object.assign(new Error("Retro board not found"), {
      statusCode: 404,
    });
  }

  return serializeDates(board);
}

export async function updateRetro(
  projectId: string,
  boardId: string,
  input: Partial<CreateRetroInput>,
) {
  const existing = await db.query.retroBoards.findFirst({
    where: and(
      eq(retroBoards.id, boardId),
      eq(retroBoards.projectId, projectId),
    ),
  });

  if (!existing) {
    throw Object.assign(new Error("Retro board not found"), {
      statusCode: 404,
    });
  }

  const [updated] = await db
    .update(retroBoards)
    .set({
      name: input.name ?? existing.name,
      timerSeconds: input.timerSeconds ?? existing.timerSeconds,
      maxVotes: input.maxVotes ?? existing.maxVotes,
      isAnonymous: input.isAnonymous ?? existing.isAnonymous,
    })
    .where(eq(retroBoards.id, boardId))
    .returning();

  return serializeDates(updated);
}

export async function deleteRetro(projectId: string, boardId: string) {
  const [deleted] = await db
    .delete(retroBoards)
    .where(
      and(
        eq(retroBoards.id, boardId),
        eq(retroBoards.projectId, projectId),
      ),
    )
    .returning();

  if (!deleted) {
    throw Object.assign(new Error("Retro board not found"), {
      statusCode: 404,
    });
  }

  return { deleted: true };
}

export async function createNote(
  input: CreateRetroNoteInput,
  authorId: string,
) {
  // Get max position in column
  const maxPos = await db
    .select({ max: sql<number>`COALESCE(MAX(${retroNotes.position}), -1)` })
    .from(retroNotes)
    .where(eq(retroNotes.columnId, input.columnId));

  const [note] = await db
    .insert(retroNotes)
    .values({
      columnId: input.columnId,
      authorId,
      text: input.text,
      color: input.color ?? null,
      position: Number(maxPos[0].max) + 1,
      isAnonymous: true,
    })
    .returning();

  return serializeDates(note);
}

export async function updateNote(
  noteId: string,
  input: UpdateRetroNoteInput,
) {
  const existing = await db.query.retroNotes.findFirst({
    where: eq(retroNotes.id, noteId),
  });

  if (!existing) {
    throw Object.assign(new Error("Note not found"), { statusCode: 404 });
  }

  const [updated] = await db
    .update(retroNotes)
    .set({
      text: input.text ?? existing.text,
      position: input.position ?? existing.position,
    })
    .where(eq(retroNotes.id, noteId))
    .returning();

  return serializeDates(updated);
}

export async function deleteNote(noteId: string) {
  const [deleted] = await db
    .delete(retroNotes)
    .where(eq(retroNotes.id, noteId))
    .returning();

  if (!deleted) {
    throw Object.assign(new Error("Note not found"), { statusCode: 404 });
  }

  return { deleted: true };
}

export async function moveNote(
  noteId: string,
  targetColumnId: string,
  position: number,
) {
  const existing = await db.query.retroNotes.findFirst({
    where: eq(retroNotes.id, noteId),
  });

  if (!existing) {
    throw Object.assign(new Error("Note not found"), { statusCode: 404 });
  }

  const [updated] = await db
    .update(retroNotes)
    .set({
      columnId: targetColumnId,
      position,
    })
    .where(eq(retroNotes.id, noteId))
    .returning();

  return serializeDates(updated);
}

export async function toggleVote(noteId: string, userId: string) {
  return await db.transaction(async (tx) => {
    // Lock the note row to serialize concurrent vote attempts
    const [noteRow] = await tx.execute(sql`
      SELECT rn.id, rc.board_id, rb.max_votes
      FROM retro_notes rn
      JOIN retro_columns rc ON rc.id = rn.column_id
      JOIN retro_boards rb ON rb.id = rc.board_id
      WHERE rn.id = ${noteId}
      FOR UPDATE
    `);

    if (!noteRow) {
      throw Object.assign(new Error("Note not found"), { statusCode: 404 });
    }

    const existing = await tx
      .select()
      .from(retroVotes)
      .where(
        and(
          eq(retroVotes.noteId, noteId),
          eq(retroVotes.userId, userId),
        ),
      );

    if (existing.length > 0) {
      // Remove vote
      await tx
        .delete(retroVotes)
        .where(
          and(
            eq(retroVotes.noteId, noteId),
            eq(retroVotes.userId, userId),
          ),
        );
      return { voted: false };
    }

    // Count current votes by this user on this board (inside transaction)
    const boardId = (noteRow as any).board_id;
    const maxVotes = Number((noteRow as any).max_votes);

    const [voteCount] = await tx.execute(sql`
      SELECT COUNT(*) as count
      FROM retro_votes rv
      JOIN retro_notes rn ON rn.id = rv.note_id
      JOIN retro_columns rc ON rc.id = rn.column_id
      WHERE rc.board_id = ${boardId} AND rv.user_id = ${userId}
    `);

    const currentVotes = Number((voteCount as any)?.count ?? 0);

    if (currentVotes >= maxVotes) {
      throw Object.assign(
        new Error(`Maximum votes (${maxVotes}) reached for this board`),
        { statusCode: 400 },
      );
    }

    await tx.insert(retroVotes).values({ noteId, userId });
    return { voted: true };
  });
}

export async function startTimer(boardId: string) {
  const [updated] = await db
    .update(retroBoards)
    .set({
      timerRunning: true,
      timerStartedAt: new Date(),
    })
    .where(eq(retroBoards.id, boardId))
    .returning();

  return serializeDates(updated);
}

export async function stopTimer(boardId: string) {
  const [updated] = await db
    .update(retroBoards)
    .set({
      timerRunning: false,
      timerStartedAt: null,
    })
    .where(eq(retroBoards.id, boardId))
    .returning();

  return serializeDates(updated);
}

export async function convertNoteToActionItem(
  boardId: string,
  noteId: string,
  assigneeId?: string,
) {
  const note = await db.query.retroNotes.findFirst({
    where: eq(retroNotes.id, noteId),
  });

  if (!note) {
    throw Object.assign(new Error("Note not found"), { statusCode: 404 });
  }

  const [actionItem] = await db
    .insert(retroActionItems)
    .values({
      boardId,
      noteId,
      text: note.text,
      assigneeId: assigneeId ?? null,
      isDone: false,
    })
    .returning();

  return actionItem;
}

export async function convertActionItemToIssue(
  actionItemId: string,
  projectId: string,
  reporterId: string,
) {
  const actionItem = await db.query.retroActionItems.findFirst({
    where: eq(retroActionItems.id, actionItemId),
  });

  if (!actionItem) {
    throw Object.assign(new Error("Action item not found"), {
      statusCode: 404,
    });
  }

  // Get the default status
  const defaultStatus = await db.query.workflowStatuses.findFirst({
    where: and(
      eq(workflowStatuses.projectId, projectId),
      eq(workflowStatuses.category, "todo"),
    ),
    orderBy: (ws, { asc }) => [asc(ws.position)],
  });

  // Get the next issue number
  const maxResult = await db
    .select({ max: sql<number>`COALESCE(MAX(${issues.issueNumber}), 0)` })
    .from(issues)
    .where(eq(issues.projectId, projectId));

  const nextNumber = Number(maxResult[0].max) + 1;

  const [issue] = await db
    .insert(issues)
    .values({
      projectId,
      issueNumber: nextNumber,
      type: "task",
      title: actionItem.text,
      description: `Created from retro action item`,
      statusId: defaultStatus?.id ?? null,
      priority: "medium",
      reporterId,
      assigneeId: actionItem.assigneeId,
      position: 0,
    })
    .returning();

  // Link the action item to the issue
  await db
    .update(retroActionItems)
    .set({ issueId: issue.id })
    .where(eq(retroActionItems.id, actionItemId));

  return serializeDates(issue);
}
