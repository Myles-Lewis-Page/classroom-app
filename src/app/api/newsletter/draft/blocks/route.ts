import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getCurrentClassroomId } from "@/lib/classroomScope";
import { getOrCreateDraft, defaultContentForType, defaultLayoutForType, BLOCK_TYPES, NewsletterBlockType } from "@/lib/newsletter";

// POST { type } - appends a new block of the given type, with sensible
// default content, to the end of the current draft.
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const classroomId = await getCurrentClassroomId();
  if (!classroomId) return NextResponse.json({ error: "No classroom set up yet" }, { status: 400 });

  const body = await req.json();
  const type = body.type as string;
  if (!BLOCK_TYPES.includes(type as NewsletterBlockType)) {
    return NextResponse.json({ error: "Invalid block type" }, { status: 400 });
  }

  const draft = await getOrCreateDraft(classroomId);
  const maxOrder = draft.blocks.reduce((max, b) => Math.max(max, b.order), -1);
  const layout = defaultLayoutForType(type as NewsletterBlockType);

  // A requested start column (from the "Add to column" picker) overrides
  // the type's default column - span is then clamped so it can't push the
  // block off the 4-column grid from that starting point.
  let column = layout.column;
  let span = layout.span;
  if (body.column !== undefined) {
    column = Math.min(4, Math.max(1, Math.round(Number(body.column) || 1)));
    span = Math.min(span, 5 - column);
  }

  const block = await prisma.newsletterBlock.create({
    data: {
      newsletterId: draft.id,
      type,
      content: defaultContentForType(type as NewsletterBlockType) as Prisma.InputJsonValue,
      order: maxOrder + 1,
      column,
      span,
    },
  });

  return NextResponse.json(block, { status: 201 });
}
