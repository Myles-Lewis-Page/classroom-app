import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getCurrentClassroomId } from "@/lib/classroomScope";
import { minSpanForType, NewsletterBlockType } from "@/lib/newsletter";

async function ownedDraftBlock(id: string, classroomId: string) {
  const block = await prisma.newsletterBlock.findUnique({
    where: { id },
    include: { newsletter: true },
  });
  if (!block || block.newsletter.classroomId !== classroomId) return null;
  // Published issues are a frozen historical record - editing individual
  // blocks after publish would silently rewrite history without updating
  // the frozen renderedText snapshot, so this only ever touches the draft.
  if (block.newsletter.status !== "draft") return null;
  return block;
}

// PATCH { content?, column?, span? } - update a block's content and/or its
// position on the 4-column layout grid (column: 1-4 where it starts,
// span: how wide it is). Clamped server-side so a bad value can't push a
// block off the grid or below that block type's minimum width (see
// minSpanForType - most types need at least 2 columns to read sensibly;
// word-list-style blocks can go down to 1).
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const classroomId = await getCurrentClassroomId();
  const block = classroomId ? await ownedDraftBlock(id, classroomId) : null;
  if (!classroomId || !block) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const data: { content?: object; column?: number; span?: number } = {};

  if (body.content !== undefined) {
    data.content = body.content;
  }
  if (body.column !== undefined) {
    data.column = Math.min(4, Math.max(1, Math.round(Number(body.column) || 1)));
  }
  if (body.span !== undefined) {
    const minSpan = minSpanForType(block.type as NewsletterBlockType);
    data.span = Math.min(4, Math.max(minSpan, Math.round(Number(body.span) || minSpan)));
  }
  if (data.column !== undefined && data.span !== undefined && data.column + data.span > 5) {
    // Prefer shrinking the column start over growing span past the grid
    // edge; if even the type's minimum span doesn't fit there, pull the
    // column back instead of overflowing.
    const minSpan = minSpanForType(block.type as NewsletterBlockType);
    if (5 - data.column >= minSpan) {
      data.span = 5 - data.column;
    } else {
      data.column = 5 - data.span;
    }
  }
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "content, column, or span is required" }, { status: 400 });
  }

  const updated = await prisma.newsletterBlock.update({ where: { id }, data });
  return NextResponse.json(updated);
}

// DELETE - remove one block from the current draft
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const classroomId = await getCurrentClassroomId();
  if (!classroomId || !(await ownedDraftBlock(id, classroomId))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.newsletterBlock.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
