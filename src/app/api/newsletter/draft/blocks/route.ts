import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getCurrentClassroomId } from "@/lib/classroomScope";
import { getOrCreateDraft, defaultContentForType, BLOCK_TYPES, NewsletterBlockType } from "@/lib/newsletter";

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

  const block = await prisma.newsletterBlock.create({
    data: {
      newsletterId: draft.id,
      type,
      content: defaultContentForType(type as NewsletterBlockType) as Prisma.InputJsonValue,
      order: maxOrder + 1,
    },
  });

  return NextResponse.json(block, { status: 201 });
}
