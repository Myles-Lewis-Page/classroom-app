import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getCurrentClassroomId } from "@/lib/classroomScope";

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

// PATCH { content } - update one block's content (shape depends on its type)
export async function PATCH(
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

  const body = await req.json();
  if (body.content === undefined) {
    return NextResponse.json({ error: "content is required" }, { status: 400 });
  }

  const updated = await prisma.newsletterBlock.update({
    where: { id },
    data: { content: body.content },
  });
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
