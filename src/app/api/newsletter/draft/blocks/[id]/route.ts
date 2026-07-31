import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getCurrentClassroomId } from "@/lib/classroomScope";
import { minSpanForType, NewsletterBlockType } from "@/lib/newsletter";
import { findCollision } from "@/lib/newsletterGrid";

const MAX_HEIGHT = 6; // reasonable ceiling so a fat-fingered value can't blow up the grid

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

// PATCH { content?, column?, span?, row?, height? } - update a block's
// content and/or its position on the grid. Layout fields are clamped
// server-side (can't go below the type's minimum width, can't push off
// the grid) and then checked for a collision against every other block in
// the same draft - if the resulting rectangle would overlap another
// block, the whole update is rejected (409) and nothing is saved. This is
// the actual enforcement; the client-side picker just tries to avoid
// offering options that would trigger it.
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
  const data: { content?: object; column?: number; span?: number; row?: number; height?: number } = {};

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
  if (body.row !== undefined) {
    data.row = Math.max(1, Math.round(Number(body.row) || 1));
  }
  if (body.height !== undefined) {
    data.height = Math.min(MAX_HEIGHT, Math.max(1, Math.round(Number(body.height) || 1)));
  }

  // Resolve the final column/span so one can't overflow the grid relative
  // to the other, whichever one (or both) is actually being changed here.
  if (data.column !== undefined || data.span !== undefined) {
    const finalColumn = data.column ?? block.column;
    const finalSpan = data.span ?? block.span;
    if (finalColumn + finalSpan > 5) {
      const minSpan = minSpanForType(block.type as NewsletterBlockType);
      if (5 - finalColumn >= minSpan) {
        data.span = 5 - finalColumn;
      } else {
        data.column = 5 - finalSpan;
      }
    }
  }

  const isLayoutChange = data.column !== undefined || data.span !== undefined || data.row !== undefined || data.height !== undefined;
  if (isLayoutChange) {
    const candidate = {
      column: data.column ?? block.column,
      span: data.span ?? block.span,
      row: data.row ?? block.row,
      height: data.height ?? block.height,
    };
    const others = await prisma.newsletterBlock.findMany({
      where: { newsletterId: block.newsletterId, id: { not: id } },
      select: { id: true, column: true, span: true, row: true, height: true },
    });
    const collision = findCollision(candidate, others);
    if (collision) {
      return NextResponse.json(
        { error: "That spot is already taken by another block - pick a different row or column." },
        { status: 409 }
      );
    }
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "content, column, span, row, or height is required" }, { status: 400 });
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
